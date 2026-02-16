import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import JSZip from 'https://esm.sh/jszip@3.10.1';
import { downloadPackageReadyTemplate } from '../../../services/emailTemplates/downloadPackageReady.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { order_id } = await req.json();

        if (!order_id) {
            throw new Error('order_id is required');
        }

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        // Calculate expiry (48 hours from now)
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 48);

        // Create download package record
        const { data: downloadPackage, error: packageError } = await supabase
            .from('download_packages')
            .insert({
                order_id,
                status: 'generating',
                item_count: 0,
                expires_at: expiresAt.toISOString(),
            })
            .select()
            .single();

        if (packageError) {
            console.error('Error creating download package:', packageError);
            throw packageError;
        }

        console.log('📦 Download package created:', downloadPackage.id);

        // Fetch order items with gallery items
        const { data: orderItems, error: itemsError } = await supabase
            .from('order_items')
            .select(`
        *,
        gallery_items (
          id,
          title,
          original_url,
          type
        )
      `)
            .eq('order_id', order_id);

        if (itemsError) {
            console.error('Error fetching order items:', itemsError);
            throw itemsError;
        }

        if (!orderItems || orderItems.length === 0) {
            throw new Error('No items found for this order');
        }

        console.log(`📥 Fetching ${orderItems.length} items for zip...`);

        // Create zip file
        const zip = new JSZip();
        let totalSize = 0;
        let successCount = 0;
        let failCount = 0;

        // Download and add files to zip
        for (let i = 0; i < orderItems.length; i++) {
            const item = orderItems[i];
            const galleryItem = item.gallery_items;

            if (!galleryItem || !galleryItem.original_url) {
                console.warn(`⚠️ Skipping item ${i + 1}: No original URL`);
                failCount++;
                continue;
            }

            try {
                console.log(`📥 Downloading ${i + 1}/${orderItems.length}: ${galleryItem.title}`);

                // Parse the Supabase Storage URL
                const url = new URL(galleryItem.original_url);
                const pathParts = url.pathname.split('/');
                const objectIndex = pathParts.indexOf('object');

                if (objectIndex === -1) {
                    throw new Error('Invalid Supabase Storage URL');
                }

                const bucketName = pathParts[objectIndex + 2];
                const filePath = pathParts.slice(objectIndex + 3).join('/');

                // Download file from Supabase Storage
                const { data: fileData, error: downloadError } = await supabase.storage
                    .from(bucketName)
                    .download(filePath);

                if (downloadError) {
                    console.error(`❌ Error downloading ${galleryItem.title}:`, downloadError);
                    failCount++;
                    continue;
                }

                if (!fileData) {
                    console.warn(`⚠️ No data for ${galleryItem.title}`);
                    failCount++;
                    continue;
                }

                // Determine file extension
                const extension = galleryItem.type === 'photo' ? 'jpg' : 'mp4';
                const fileName = `${galleryItem.title.replace(/[^a-z0-9]/gi, '_')}.${extension}`;

                // Add to zip
                const arrayBuffer = await fileData.arrayBuffer();
                zip.file(fileName, arrayBuffer);

                totalSize += fileData.size;
                successCount++;

                console.log(`✅ Added ${fileName} (${(fileData.size / 1024 / 1024).toFixed(2)} MB)`);
            } catch (error) {
                console.error(`❌ Failed to process ${galleryItem.title}:`, error);
                failCount++;
            }
        }

        console.log(`📊 Zip summary: ${successCount} succeeded, ${failCount} failed`);

        if (successCount === 0) {
            throw new Error('Failed to add any files to zip');
        }

        // Generate zip file
        console.log('🗜️ Generating zip file...');
        const zipBlob = await zip.generateAsync({
            type: 'uint8array',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
        });

        console.log(`✅ Zip generated: ${(zipBlob.length / 1024 / 1024).toFixed(2)} MB`);

        // Upload to Supabase Storage
        const zipFileName = `download-packages/${order_id}.zip`;
        console.log(`📤 Uploading to storage: ${zipFileName}`);

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('media')
            .upload(zipFileName, zipBlob, {
                contentType: 'application/zip',
                upsert: true,
            });

        if (uploadError) {
            console.error('❌ Upload error:', uploadError);
            throw uploadError;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('media')
            .getPublicUrl(zipFileName);

        console.log(`🔗 Public URL: ${publicUrl}`);

        // Update package record
        const { error: updateError } = await supabase
            .from('download_packages')
            .update({
                status: 'ready',
                item_count: successCount,
                zip_file_url: publicUrl,
                zip_file_size: zipBlob.length,
            })
            .eq('id', downloadPackage.id);

        if (updateError) {
            console.error('Error updating download package:', updateError);
            throw updateError;
        }

        console.log('✅ Download package ready!');

        // Send email notification
        try {
            const { data: order, error: orderError } = await supabase
                .from('orders')
                .select(`
                    id,
                    client_id,
                    created_at,
                    order_items (
                        gallery_items (
                            sessions (
                                name
                            )
                        )
                    )
                `)
                .eq('id', order_id)
                .single();

            if (orderError || !order) {
                console.warn('⚠️ Could not fetch order for email notification:', orderError);
            } else {
                // Fetch profile separately
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('email, name')
                    .eq('id', order.client_id)
                    .single();

                if (profileError || !profile || !profile.email) {
                    console.warn('⚠️ Could not fetch profile for email notification');
                } else if (RESEND_API_KEY) {
                    // Get event name from the first item's session
                    const eventName = order.order_items?.[0]?.gallery_items?.sessions?.name || 'Your Event';

                    // Generate email content
                    const emailTemplate = downloadPackageReadyTemplate(
                        profile.name || 'Valued Client',
                        eventName,
                        successCount,
                        zipBlob.length,
                        publicUrl,
                        expiresAt
                    );

                    // Send email via Resend
                    const emailResponse = await fetch('https://api.resend.com/emails', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${RESEND_API_KEY}`,
                        },
                        body: JSON.stringify({
                            from: 'TFC Media <noreply@tfcmediagroup.com>',
                            to: [profile.email],
                            subject: emailTemplate.subject,
                            html: emailTemplate.html,
                        }),
                    });

                    const emailData = await emailResponse.json();

                    if (emailResponse.ok) {
                        console.log(`✅ Email sent to ${profile.email}, Email ID: ${emailData.id}`);
                    } else {
                        console.error('❌ Failed to send email:', emailData);
                    }
                } else {
                    console.warn('⚠️ RESEND_API_KEY not set - skipping email notification');
                    console.log(`   Would send to: ${profile.email}`);
                }
            }
        } catch (emailError) {
            console.error('❌ Error sending email notification:', emailError);
            // Don't fail the whole function if email fails
        }

        return new Response(
            JSON.stringify({
                success: true,
                package: {
                    id: downloadPackage.id,
                    order_id,
                    item_count: successCount,
                    zip_file_size: zipBlob.length,
                    zip_file_url: publicUrl,
                    status: 'ready',
                    expires_at: expiresAt.toISOString(),
                },
                message: `Download package ready with ${successCount} items (${failCount} failed)`
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        );
    } catch (error) {
        console.error('❌ Function error:', error);

        // Try to update package status to failed
        try {
            const { order_id } = await req.json();
            if (order_id) {
                const supabase = createClient(
                    Deno.env.get('SUPABASE_URL')!,
                    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
                );

                await supabase
                    .from('download_packages')
                    .update({
                        status: 'failed',
                        error_message: error.message,
                    })
                    .eq('order_id', order_id)
                    .eq('status', 'generating');
            }
        } catch (updateErr) {
            console.error('Error updating failed status:', updateErr);
        }

        return new Response(
            JSON.stringify({
                success: false,
                error: error.message
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            }
        );
    }
});

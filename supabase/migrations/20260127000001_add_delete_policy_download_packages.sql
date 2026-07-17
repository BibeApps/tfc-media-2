-- Add DELETE policy for download_packages
-- Allow users to delete their own download packages

CREATE POLICY "Users can delete own download packages"
    ON download_packages FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = download_packages.order_id
            AND orders.client_id = auth.uid()
        )
    );

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, AlertCircle, CheckCircle, ArrowLeft, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const ForgotPassword: React.FC = () => {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus('idle');
    setMessage('');

    try {
      const result = await requestPasswordReset(email);
      if (result.success) {
        setStatus('success');
        setMessage(result.message || 'Check your email for reset instructions.');
      } else {
        setStatus('error');
        setMessage(result.message || 'Failed to process request.');
      }
    } catch (err) {
      setStatus('error');
      setMessage('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-24 flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-obsidian transition-colors duration-300">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-8 bg-white dark:bg-charcoal p-8 rounded-2xl border border-gray-200 dark:border-white/5 shadow-xl"
      >
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-electric/10 rounded-xl flex items-center justify-center text-electric mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-3xl font-heading font-bold text-gray-900 dark:text-white">Forgot Password?</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            No worries! Enter your email and we'll send you reset instructions.
          </p>
        </div>

        {status === 'success' ? (
           <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/50 p-6 rounded-xl text-center space-y-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mx-auto text-green-600 dark:text-green-400">
                  <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white">Check Your Email</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                 We've sent a password reset link to <span className="font-bold">{email}</span>.
              </p>
              
              <div className="pt-4 border-t border-green-200 dark:border-green-900/30">
                 <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Demo Mode: Since we can't send real emails:</p>
                 <Link 
                    to={`/reset-password?email=${encodeURIComponent(email)}`}
                    className="inline-block px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 transition-colors"
                 >
                    Simulate Clicking Email Link
                 </Link>
              </div>

              <button 
                onClick={() => setStatus('idle')}
                className="text-sm text-green-600 dark:text-green-400 font-bold hover:underline mt-4 block mx-auto"
              >
                 Try another email
              </button>
           </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {status === 'error' && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 p-4 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-600 dark:text-red-400">{message}</p>
                </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-white/10 rounded-lg leading-5 bg-white dark:bg-obsidian text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-electric focus:border-electric sm:text-sm transition-colors"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-electric hover:bg-electric/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-electric transition-colors shadow-lg shadow-electric/20 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
              {!loading && (
                <span className="absolute right-0 inset-y-0 flex items-center pr-3">
                  <ArrowRight className="h-5 w-5 text-electric-200 group-hover:text-electric-100" />
                </span>
              )}
            </button>
            
            <div className="text-center">
                <Link to="/login" className="text-sm font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center justify-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back to Login
                </Link>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
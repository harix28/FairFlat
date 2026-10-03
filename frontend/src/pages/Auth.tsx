import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { authApi } from '../services/api';
import { useAppContext } from '../context/AppContext';
import { Loader2, Eye, EyeOff, Chrome } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';

type AuthMode = 'login' | 'signup' | 'forgot';

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>(searchParams.get('signup') === 'true' ? 'signup' : 'login');
  const navigate = useNavigate();
  const { setUser } = useAppContext();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (mode === 'forgot') {
        await authApi.forgotPassword({ email });
        setSuccess('If that email is registered, you\'ll receive a password reset link shortly.');
        setLoading(false);
        return;
      }

      let res;
      if (mode === 'login') {
        res = await authApi.login({ email, password });
      } else {
        res = await authApi.register({ name, email, password });
      }

      const { token, user } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      navigate('/app');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setLoading(true);
    setError('');
    try {
      const res = await authApi.googleLogin({ credential: credentialResponse.credential });
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      navigate('/app');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'flex h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all';

  const titles = {
    login: { title: 'Welcome back 👋', desc: 'Sign in to your Roomio account' },
    signup: { title: 'Create an account', desc: 'Start managing expenses with your flatmates' },
    forgot: { title: 'Forgot password?', desc: 'Enter your email and we\'ll send you a reset link' },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 flex items-center justify-center p-4">
      {/* Logo */}
      <div className="absolute top-8 left-8">
        <div
          className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center gap-2 cursor-pointer"
          onClick={() => navigate('/')}
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md">R</div>
          Roomio
        </div>
      </div>

      <div className="w-full max-w-md">
        <Card className="border-0 shadow-2xl shadow-blue-900/10">
          <CardHeader className="space-y-1 text-center pb-2">
            <CardTitle className="text-2xl font-bold text-slate-900">{titles[mode].title}</CardTitle>
            <CardDescription className="text-slate-500">{titles[mode].desc}</CardDescription>
          </CardHeader>

          {/* Google Sign-In — only for login/signup */}
          {mode !== 'forgot' && (
            <div className="px-6 pt-2 pb-4">
              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError('Google sign-in failed')}
                  text={mode === 'signup' ? 'signup_with' : 'signin_with'}
                  shape="pill"
                  size="large"
                  width="340"
                />
              </div>
              <div className="flex items-center gap-3 mt-4">
                <hr className="flex-1 border-slate-200" />
                <span className="text-xs text-slate-400 font-medium">or continue with email</span>
                <hr className="flex-1 border-slate-200" />
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 pt-0">
              {error && <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm">{error}</div>}
              {success && <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-lg text-sm">{success}</div>}

              {mode === 'signup' && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700" htmlFor="name">Full Name</label>
                  <input
                    id="name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className={inputClass}
                    placeholder="Hari Sharma"
                    required
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700" htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="you@example.com"
                  required
                />
              </div>

              {mode !== 'forgot' && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700" htmlFor="password">Password</label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => setMode('forgot')}
                        className="text-xs text-blue-600 hover:underline font-medium"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className={inputClass + ' pr-10'}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </CardContent>

            <CardFooter className="flex flex-col space-y-4 pt-2">
              <Button type="submit" className="w-full h-11 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-200 font-semibold" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
              </Button>

              <div className="text-center text-sm text-slate-500">
                {mode === 'forgot' ? (
                  <>
                    Remember your password?{' '}
                    <button type="button" onClick={() => setMode('login')} className="text-blue-600 hover:underline font-medium">
                      Sign in
                    </button>
                  </>
                ) : mode === 'login' ? (
                  <>
                    Don't have an account?{' '}
                    <button type="button" onClick={() => setMode('signup')} className="text-blue-600 hover:underline font-medium">
                      Sign up
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button type="button" onClick={() => setMode('login')} className="text-blue-600 hover:underline font-medium">
                      Sign in
                    </button>
                  </>
                )}
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Auth;

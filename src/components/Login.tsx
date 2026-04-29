import React, { useState } from 'react';
import { LogIn, AlertTriangle, ShieldCheck, Mail, Lock, Loader2, User as UserIcon, Check, Eye, EyeOff, Globe, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { signInWithPopup, googleProvider, auth, isFirebaseConfigured, db, doc, setDoc, signInWithEmailAndPassword, createUserWithEmailAndPassword } from '../firebase';

export default function Login() {
  const [loginMethod, setLoginMethod] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const handleGoogleLogin = async () => {
    if (!isFirebaseConfigured) return;
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed:", error);
      toast.error("Google login failed. Please try again.");
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter both email and password.");
      return;
    }
    setIsLoggingIn(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error("Login failed:", error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        toast.error("Invalid email or password.");
      } else if (error.code === 'auth/operation-not-allowed') {
        toast.error("Email/Password login is not enabled in Firebase Console.");
      } else {
        toast.error("Login failed. Please try again.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error("Please fill in all fields.");
      return;
    }
    setIsLoggingIn(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const userRef = doc(db, 'users', userCredential.user.uid);
      await setDoc(userRef, { name: name }, { merge: true });
      toast.success("Registration successful! Please wait for admin approval.");
    } catch (error: any) {
      console.error("Registration failed:", error);
      if (error.code === 'auth/email-already-in-use') {
        toast.error("Email is already registered.");
      } else if (error.code === 'auth/weak-password') {
        toast.error("Password should be at least 6 characters.");
      } else {
        toast.error("Registration failed. Please try again.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-brand overflow-hidden">
      {/* Left Side: Branding / Marketing */}
      <div className="hidden lg:flex flex-col w-full lg:w-[45%] xl:w-[45%] relative overflow-hidden bg-[#0A34A6] bg-gradient-to-br from-[#0D39B8] to-[#071f6f]">
        {/* Background Rings / Wave pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
           <svg width="100%" height="100%" viewBox="0 0 800 800" xmlns="http://www.w3.org/2000/svg">
             <path d="M0,400 Q200,600 400,400 T800,400" fill="none" stroke="white" strokeWidth="2" />
             <path d="M0,500 Q200,700 400,500 T800,500" fill="none" stroke="white" strokeWidth="2" />
             <path d="M0,300 Q200,500 400,300 T800,300" fill="none" stroke="white" strokeWidth="2" />
             <circle cx="600" cy="200" r="400" fill="none" stroke="white" strokeWidth="2" />
             <circle cx="600" cy="200" r="600" fill="none" stroke="white" strokeWidth="2" />
             <circle cx="600" cy="200" r="800" fill="none" stroke="white" strokeWidth="2" />
           </svg>
        </div>

        {/* Left decoration dots */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 grid grid-cols-2 gap-2 opacity-10">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="w-1 h-1 bg-surface rounded-full"></div>
          ))}
        </div>

        <div className="p-8 relative z-10 flex flex-col items-center justify-center h-full text-white text-center">
          <div className="w-24 h-24 xl:w-28 xl:h-28 bg-surface rounded-[24px] xl:rounded-[28px] flex items-center justify-center mb-8 shadow-xl shadow-black/10">
            <ShoppingCart className="w-12 h-12 xl:w-14 xl:h-14 text-brand-hover" strokeWidth={2.5} />
          </div>
          
          <h1 className="text-5xl xl:text-6xl font-bold tracking-tight text-white mb-2 xl:mb-3">Amar e-Com</h1>
          <p className="text-xl xl:text-2xl text-blue-200 font-medium mb-8 xl:mb-10">Business OS</p>

          <div className="w-8 h-[2px] bg-blue-300/40 mb-8 xl:mb-10 rounded-full"></div>

          <p className="text-sm xl:text-base text-blue-100 max-w-[280px] xl:max-w-[320px] leading-relaxed font-medium">
            Manage your e-commerce business<br/>from one simple platform.
          </p>
        </div>
      </div>

      {/* Right Side: Auth Form */}
      <div className="flex-1 flex flex-col bg-background">
        <div className="p-4 xl:p-6 flex justify-end">
          <div className="relative">
            <select className="appearance-none bg-surface border border-border rounded-full py-2 pl-10 pr-10 text-sm font-medium text-secondary hover:bg-surface-hover outline-none cursor-pointer">
              <option value="en">English</option>
              <option value="bn">Bangla</option>
            </select>
            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-muted w-4 h-4" />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center max-w-[420px] xl:max-w-[460px] w-full mx-auto px-6 sm:px-12 py-2 xl:py-6">
          <div className="bg-surface rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 sm:p-8 xl:p-10 w-full border border-border/50">
            <div className="text-center mb-6 xl:mb-8">
              <h1 className="text-[24px] xl:text-[28px] font-bold text-primary mb-2">Welcome Back 👋</h1>
              <p className="text-muted font-medium text-sm xl:text-base">Login to your account and continue</p>
            </div>

            {!isFirebaseConfigured && (
              <div className="mb-6 p-4 bg-orange-50 rounded-2xl border border-orange-100 flex items-start gap-3">
                <AlertTriangle size={20} className="text-orange-500 shrink-0 mt-0.5" />
                <p className="text-sm text-orange-800 leading-relaxed">
                  Firebase configuration is missing. Please complete the setup to enable secure authentication.
                </p>
              </div>
            )}

            {loginMethod === 'login' ? (
              <form onSubmit={handleEmailLogin} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-bold text-primary">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted w-5 h-5" />
                    <input 
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full pl-11 pr-4 py-3 bg-surface border border-border rounded-[12px] text-sm focus:border-brand focus:ring-4 focus:ring-brand/10 outline-none transition-all text-primary placeholder:text-muted"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-bold text-primary">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted w-5 h-5" />
                    <input 
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-11 pr-12 py-3 bg-surface border border-border rounded-[12px] text-sm focus:border-brand focus:ring-4 focus:ring-brand/10 outline-none transition-all text-primary placeholder:text-muted"
                      required
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-secondary p-1"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className="relative flex items-center justify-center">
                      <input 
                        type="checkbox" 
                        className="peer appearance-none w-5 h-5 border-2 border-border rounded-[6px] checked:bg-brand checked:border-brand transition-all cursor-pointer"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />
                      <Check className="absolute text-white w-3.5 h-3.5 opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" strokeWidth={3} />
                    </div>
                    <span className="text-[13px] xl:text-[14px] text-muted font-medium group-hover:text-primary transition-colors">Remember me</span>
                  </label>
                  <button type="button" className="text-[13px] xl:text-[14px] font-bold text-brand hover:text-brand-hover transition-colors">
                    Forgot Password?
                  </button>
                </div>

                <button 
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-brand text-white rounded-[12px] font-bold text-[14px] hover:bg-brand-hover transition-all disabled:opacity-50 active:scale-[0.98] shadow-subtle shadow-brand/20 mt-2"
                >
                  {isLoggingIn ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <>
                      <Lock size={16} />
                      Log in to Dashboard
                    </>
                  )}
                </button>

                <div className="relative flex items-center py-2">
                  <div className="flex-1 border-t border-border"></div>
                  <span className="px-4 text-[13px] font-medium text-muted uppercase tracking-widest">OR</span>
                  <div className="flex-1 border-t border-border"></div>
                </div>

                <button 
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full flex items-center justify-center gap-3 py-3 px-6 bg-surface border border-border text-secondary rounded-[12px] font-bold text-[15px] hover:bg-surface-hover transition-all active:scale-[0.98]"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continue with Google
                </button>

                <p className="text-center text-[13px] xl:text-[14px] text-secondary font-medium pt-2">
                  Don't have an account? <button type="button" onClick={() => setLoginMethod('register')} className="text-brand font-bold hover:underline">Sign up</button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4 xl:space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-bold text-primary">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-muted w-5 h-5" />
                    <input 
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full pl-11 pr-4 py-3 bg-surface border border-border rounded-[12px] text-sm focus:border-brand focus:ring-4 focus:ring-brand/10 outline-none transition-all text-primary placeholder:text-muted"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-bold text-primary">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted w-5 h-5" />
                    <input 
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full pl-11 pr-4 py-3 bg-surface border border-border rounded-[12px] text-sm focus:border-brand focus:ring-4 focus:ring-brand/10 outline-none transition-all text-primary placeholder:text-muted"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-bold text-primary">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted w-5 h-5" />
                    <input 
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a password"
                      className="w-full pl-11 pr-12 py-3 bg-surface border border-border rounded-[12px] text-sm focus:border-brand focus:ring-4 focus:ring-brand/10 outline-none transition-all text-primary placeholder:text-muted"
                      required
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-secondary p-1"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full flex items-center justify-center gap-3 py-3 bg-brand text-white rounded-[12px] font-bold text-[15px] hover:bg-brand-hover transition-all disabled:opacity-50 active:scale-[0.98] shadow-subtle shadow-brand/20 mt-2"
                >
                  {isLoggingIn ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <>
                      <div className="w-5 h-5 shrink-0 bg-surface/20 rounded-md flex items-center justify-center">
                         <UserIcon size={14} className="text-white" />
                      </div>
                      Create Account
                    </>
                  )}
                </button>

                <p className="text-center text-[13px] xl:text-[14px] text-secondary font-medium pt-2">
                  Already have an account? <button type="button" onClick={() => setLoginMethod('login')} className="text-brand font-bold hover:underline">Log in</button>
                </p>
              </form>
            )}
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 text-[13px] font-medium text-muted">
            <Lock size={14} />
            <span>Your data is safe and secure with us</span>
          </div>
        </div>
      </div>
    </div>
  );
}

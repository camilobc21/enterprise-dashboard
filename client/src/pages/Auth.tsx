import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { BarChart3, Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

type AuthMode = "login" | "register";

export function AuthPage({ mode }: { mode: AuthMode }) {
  const [, navigate] = useLocation();
  const { isAuthenticated, loading } = useAuth();
  const utils = trpc.useUtils();
  const login = trpc.auth.login.useMutation();
  const register = trpc.auth.register.useMutation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const isRegister = mode === "register";
  const isSubmitting = login.isPending || register.isPending;

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, loading, navigate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      if (isRegister) {
        await register.mutateAsync({ name, email, password });
        toast.success("Cuenta creada. Bienvenido al dashboard.");
      } else {
        await login.mutateAsync({ email, password });
        toast.success("Sesión iniciada correctamente.");
      }

      await utils.auth.me.invalidate();
      navigate("/dashboard");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No fue posible completar la operación.";
      toast.error(message);
    }
  }

  return (
    <main className="min-h-screen bg-[#0b1220] px-4 py-8 text-slate-100 sm:py-12">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-5xl overflow-hidden rounded-3xl border border-slate-700/80 bg-slate-900 shadow-2xl shadow-black/30 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative hidden overflow-hidden bg-gradient-to-br from-blue-700 via-blue-800 to-slate-950 p-10 lg:block">
          <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-300/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-indigo-400/20 blur-3xl" />
          <div className="relative flex h-full flex-col justify-between">
            <Link href="/" className="flex w-fit items-center gap-3 font-semibold text-white">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/15 ring-1 ring-white/20">
                <BarChart3 className="h-6 w-6" />
              </span>
              <span>Enterprise Dashboard</span>
            </Link>
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-cyan-200">Control operativo</p>
              <h1 className="max-w-md text-4xl font-bold leading-tight text-white">
                Analiza tus redes WiFi desde un solo lugar.
              </h1>
              <p className="mt-5 max-w-md text-base leading-7 text-blue-100">
                Gestiona lecturas, alertas y análisis en tiempo real con una cuenta protegida por contraseña.
              </p>
            </div>
            <p className="text-sm text-blue-200">Acceso exclusivo para usuarios registrados.</p>
          </div>
        </section>

        <section className="flex items-center bg-slate-950/40 p-6 sm:p-10">
          <div className="mx-auto w-full max-w-sm">
            <Link href="/" className="mb-10 flex items-center gap-3 font-semibold text-white lg:hidden">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600"><BarChart3 className="h-5 w-5" /></span>
              Enterprise Dashboard
            </Link>
            <div className="mb-8">
              <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-blue-500/15 text-blue-300 ring-1 ring-blue-400/25">
                {isRegister ? <UserRound className="h-6 w-6" /> : <LockKeyhole className="h-6 w-6" />}
              </div>
              <h2 className="text-2xl font-bold text-white">
                {isRegister ? "Crea tu cuenta" : "Bienvenido de nuevo"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {isRegister
                  ? "Regístrate con tu nombre, correo y una contraseña de al menos 6 caracteres."
                  : "Ingresa tu correo y contraseña para abrir el dashboard."}
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit} noValidate>
              {isRegister && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-200">Nombre completo</Label>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <Input id="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Tu nombre" autoComplete="name" required className="border-slate-700 bg-slate-900 pl-10 text-white placeholder:text-slate-500" />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-200">Correo electrónico</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu@correo.com" autoComplete="email" required className="border-slate-700 bg-slate-900 pl-10 text-white placeholder:text-slate-500" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-200">Contraseña</Label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo 6 caracteres" autoComplete={isRegister ? "new-password" : "current-password"} minLength={6} required className="border-slate-700 bg-slate-900 pl-10 pr-11 text-white placeholder:text-slate-500" />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-white" aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full bg-blue-600 text-white hover:bg-blue-500" disabled={isSubmitting}>
                {isSubmitting ? "Procesando…" : isRegister ? "Crear cuenta" : "Iniciar sesión"}
              </Button>
            </form>

            <p className="mt-7 text-center text-sm text-slate-400">
              {isRegister ? "¿Ya tienes una cuenta?" : "¿Aún no tienes una cuenta?"}{" "}
              <Link href={isRegister ? "/login" : "/register"} className="font-medium text-blue-300 transition-colors hover:text-blue-200">
                {isRegister ? "Inicia sesión" : "Regístrate"}
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

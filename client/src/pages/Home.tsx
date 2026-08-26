import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, useLocation } from "wouter";
import { useEffect } from "react";
import { BarChart3, Lock, Zap, Users, FileText, MessageSquare, ArrowRight } from "lucide-react";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, user, navigate]);

  if (isAuthenticated && user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Navigation */}
      <nav className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-blue-500" />
            <span className="text-xl font-bold text-white">Enterprise Dashboard</span>
          </div>
          <Button asChild variant="default">
            <Link href="/login">Iniciar sesión</Link>
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
          Dashboard Empresarial Profesional
        </h1>
        <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
          Plataforma local para autenticación, observaciones WiFi persistidas, inventario de red autorizado y asistentes IA configurables.
        </p>
        <div className="flex gap-4 justify-center">
          <Button asChild size="lg" className="gap-2">
            <Link href="/register">
              Crear cuenta <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-white mb-12 text-center">Características Principales</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="bg-slate-800 border-slate-700 hover:border-blue-500 transition-colors">
            <CardHeader>
              <Lock className="h-8 w-8 text-blue-500 mb-2" />
              <CardTitle className="text-white">Autenticación Segura</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300">Contraseñas protegidas y sesiones seguras para tus datos</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700 hover:border-blue-500 transition-colors">
            <CardHeader>
              <BarChart3 className="h-8 w-8 text-green-500 mb-2" />
              <CardTitle className="text-white">Gráficos Avanzados</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300">Visualizaciones de los registros que están disponibles en el proyecto</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700 hover:border-blue-500 transition-colors">
            <CardHeader>
              <MessageSquare className="h-8 w-8 text-purple-500 mb-2" />
              <CardTitle className="text-white">IA Integrada</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300">Asistente configurable con tu propia clave API para consultas y análisis</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700 hover:border-blue-500 transition-colors">
            <CardHeader>
              <Users className="h-8 w-8 text-orange-500 mb-2" />
              <CardTitle className="text-white">Gestión de Usuarios</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300">Control completo de roles, permisos y acceso a funcionalidades</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700 hover:border-blue-500 transition-colors">
            <CardHeader>
              <FileText className="h-8 w-8 text-red-500 mb-2" />
              <CardTitle className="text-white">Gestión de Documentos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300">Subida, almacenamiento y descarga segura de archivos</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700 hover:border-blue-500 transition-colors">
            <CardHeader>
              <Zap className="h-8 w-8 text-yellow-500 mb-2" />
              <CardTitle className="text-white">Tiempo Real</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300">Canal de notificaciones en vivo cuando el servicio se encuentra disponible</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-12 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">¿Listo para comenzar?</h2>
          <p className="text-blue-100 mb-8">Accede ahora y descubre todas las características del dashboard</p>
          <Button asChild size="lg" className="bg-white text-blue-600 hover:bg-slate-100">
            <Link href="/login">Iniciar sesión ahora</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700 bg-slate-900 py-8">
        <div className="container mx-auto px-4 text-center text-slate-400">
          <p>&copy; 2026 Enterprise Dashboard. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

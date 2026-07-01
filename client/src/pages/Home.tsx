import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { BarChart3, Lock, Zap, Users, FileText, MessageSquare, TrendingUp, ArrowRight } from "lucide-react";
import { UserSelector } from "@/components/UserSelector";

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
            <a href={getLoginUrl()}>Iniciar Sesión</a>
          </Button>
        </div>
      </nav>

      {/* Development User Selector */}
      <section className="container mx-auto px-4 py-8">
        <div className="flex justify-center">
          <UserSelector />
        </div>
      </section>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
          Dashboard Empresarial Profesional
        </h1>
        <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
          Sistema completo de gestión con autenticación segura, análisis en tiempo real, integración con IA y mucho más.
        </p>
        <div className="flex gap-4 justify-center">
          <Button asChild size="lg" className="gap-2">
            <a href={getLoginUrl()}>
              Comenzar Ahora <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
          <Button variant="outline" size="lg">
            Ver Demo
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
              <p className="text-slate-300">JWT y OAuth2 integrados para máxima seguridad en tus datos</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700 hover:border-blue-500 transition-colors">
            <CardHeader>
              <BarChart3 className="h-8 w-8 text-green-500 mb-2" />
              <CardTitle className="text-white">Gráficos Avanzados</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300">Visualizaciones interactivas con Recharts para análisis profundo</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700 hover:border-blue-500 transition-colors">
            <CardHeader>
              <MessageSquare className="h-8 w-8 text-purple-500 mb-2" />
              <CardTitle className="text-white">IA Integrada</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300">Asistente inteligente con Claude API para consultas y análisis</p>
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
              <p className="text-slate-300">WebSockets para notificaciones y sincronización instantánea</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-4 py-20 border-t border-slate-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-4xl font-bold text-blue-500 mb-2">100%</div>
            <p className="text-slate-300">Funcionalidades Implementadas</p>
          </div>
          <div>
            <div className="text-4xl font-bold text-green-500 mb-2">7+</div>
            <p className="text-slate-300">Módulos Principales</p>
          </div>
          <div>
            <div className="text-4xl font-bold text-purple-500 mb-2">∞</div>
            <p className="text-slate-300">Escalabilidad</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-12 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">¿Listo para comenzar?</h2>
          <p className="text-blue-100 mb-8">Accede ahora y descubre todas las características del dashboard</p>
          <Button asChild size="lg" className="bg-white text-blue-600 hover:bg-slate-100">
            <a href={getLoginUrl()}>Iniciar Sesión Ahora</a>
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

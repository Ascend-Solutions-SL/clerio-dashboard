// app/login/page.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [firstName, setFirstName] = useState(""); // Nombre
  const [lastName, setLastName] = useState(""); // Apellidos
  const [businessName, setBusinessName] = useState(""); // Nombre Empresa

  const signIn = async () => {
    setLoading(true);
    setError(null);
    setInfo(null);
    setShowResend(false);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      const needsConfirm = /confirm|confirmation|verified|verify/i.test(error.message);
      if (needsConfirm) {
        setError("Email no confirmado. Revisa tu bandeja o reenvía el email de confirmación.");
        setShowResend(true);
      } else {
        setError(error.message);
      }
      setLoading(false);
      return;
    }

    router.replace("/?tab=integraciones");
  };

  const signUp = async () => {
    // Si aún no está en modo registro, activarlo y no continuar
    if (!isRegister) {
      setIsRegister(true);
      return;
    }

    // Validaciones de campos adicionales requeridos
    if (!firstName.trim() || !lastName.trim() || !businessName.trim()) {
      setError("Por favor, completa Nombre, Apellidos y Nombre Empresa para registrarte.");
      return;
    }

    setLoading(true);
    setError(null);
    setInfo(null);
    setShowResend(false);

    try {
      console.log('Starting sign up process...');
      
      // Preparar metadatos del usuario (para el trigger)
      const userMetadata = {
        email: email.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        user_initials: `${firstName.trim()[0] ?? ""}${lastName.trim()[0] ?? ""}`.toUpperCase(),
        user_businessname: businessName.trim()
      };

      console.log('Creating user in Supabase Auth with metadata:', userMetadata);
      
      // Registrar al usuario en Supabase Auth con los metadatos
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userMetadata,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) throw signUpError;

      // El trigger handle_new_user() se encargará de insertar en auth_users automáticamente
      console.log('User registration completed successfully');
      setInfo("Registro creado. Hemos enviado un email de confirmación. Confirma tu cuenta para poder iniciar sesión.");
      setShowResend(true);
      
    } catch (error) {
      console.error('Error durante el registro:', error);
      
      // Manejo de errores
      if (error instanceof Error) {
        setError(`Error: ${error.message}`);
      } else {
        setError('Error desconocido durante el registro. Por favor, inténtalo de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  const resendConfirmation = async () => {
    setResendLoading(true);
    setError(null);
    setInfo(null);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) {
        setError(error.message);
      } else {
        setInfo("Email de confirmación reenviado. Revisa tu bandeja de entrada.");
      }
    } finally {
      setResendLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegister) {
      await signUp();
    } else {
      await signIn();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md border-gray-200">
        <CardHeader>
          <CardTitle className="text-xl">{isRegister ? "Registro" : "Acceso"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu-email@dominio.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                required
              />
            </div>
            {isRegister && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <Input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Tu nombre"
                    required={isRegister}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos</label>
                  <Input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Tus apellidos"
                    required={isRegister}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Empresa</label>
                  <Input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Nombre de tu empresa"
                    required={isRegister}
                  />
                </div>
              </>
            )}
            {error && <div className="text-sm text-red-600">{error}</div>}
            {info && <div className="text-sm text-green-700">{info}</div>}

            <div className="flex flex-col gap-2">
              <Button type="submit" disabled={loading} className="w-full bg-gray-900 hover:bg-gray-800 text-white">
                {loading ? (isRegister ? "Registrando..." : "Entrando...") : isRegister ? "Confirmar registro" : "Entrar"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={() => setIsRegister((v) => !v)}
                className="w-full"
              >
                {isRegister ? "Volver a acceder" : "Crear cuenta"}
              </Button>
              {showResend && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={resendConfirmation}
                  disabled={resendLoading}
                  className="w-full text-sm"
                >
                  {resendLoading ? "Reenviando..." : "Reenviar email de confirmación"}
                </Button>
              )}
            </div>

            <p className="text-xs text-gray-500 text-center">
              Tras iniciar sesión, podrás conectar Google y completar el intercambio en la callback.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

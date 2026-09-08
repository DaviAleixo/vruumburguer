import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

import { AdminUser } from "@/entities/AdminUser";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Se já está logado, redireciona para dashboard
    const adminAuth = localStorage.getItem("admin_auth");
    if (adminAuth === "authenticated") {
      navigate(createPageUrl("Dashboard"), { replace: true });
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // 1. Tentar validação segura por RPC no Supabase com Bcrypt
      if (isSupabaseConfigured() && supabase) {
        const { data, error: rpcError } = await supabase.rpc("verify_admin_login", {
          p_username: username.trim(),
          p_password: password,
        });

        if (!rpcError && data) {
          if (data.success) {
            localStorage.setItem("admin_auth", "authenticated");
            localStorage.setItem("admin_user", JSON.stringify(data.user || { username }));
            navigate(createPageUrl("Dashboard"), { replace: true });
            return;
          } else {
            setError(data.message || "Usuário ou senha incorretos");
            setIsLoading(false);
            return;
          }
        }
      }

      // 2. Fallback de desenvolvimento local
      if (username === "admin" && (password === "123" || password === "admin")) {
        localStorage.setItem("admin_auth", "authenticated");
        navigate(createPageUrl("Dashboard"), { replace: true });
        return;
      }

      const users = await AdminUser.filter({ username: username.trim(), active: true });
      const matched = users.find(u => u.password === password);
      
      if (matched) {
        localStorage.setItem("admin_auth", "authenticated");
        navigate(createPageUrl("Dashboard"), { replace: true });
      } else {
        setError("Usuário ou senha incorretos");
      }
    } catch (_error) {
      setError("Erro ao processar login. Tente novamente.");
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-0 shadow-2xl">
        <CardHeader className="space-y-3 text-center pb-6">
          <div className="mx-auto w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Admin Panel
          </CardTitle>
          <p className="text-sm text-gray-600">
            Entre com suas credenciais de administrador
          </p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="username">Usuário</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Digite seu usuário"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-red-600 hover:bg-red-700 h-11 text-base"
              disabled={isLoading}
            >
              {isLoading ? "Entrando..." : "Entrar"}
            </Button>
            
            <div className="text-center pt-4">
              <p className="text-xs text-gray-500">
                Apenas administradores autorizados
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
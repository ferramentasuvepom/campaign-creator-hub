import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Loader2, Mail, KeyRound } from "lucide-react";

const formSchema = z.object({
    email: z.string().email({ message: "Email inválido" }),
    password: z.string().min(6, { message: "A senha deve ter no mínimo 6 caracteres" }),
    fullName: z.string().optional(),
});

const resetEmailSchema = z.object({
    email: z.string().email({ message: "Email inválido" }),
});

const newPasswordSchema = z.object({
    password: z.string().min(6, { message: "A senha deve ter no mínimo 6 caracteres" }),
    confirmPassword: z.string().min(6, { message: "Confirme sua senha" }),
}).refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
});

type ViewMode = "auth" | "forgot" | "update-password";

export default function AuthPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [view, setView] = useState<ViewMode>("auth");
    const navigate = useNavigate();
    const { toast } = useToast();

    // Detect password recovery from URL hash or auth event
    useEffect(() => {
        // Check URL hash for recovery token (e.g. #access_token=...&type=recovery)
        const hash = window.location.hash;
        if (hash && hash.includes("type=recovery")) {
            setView("update-password");
        }

        // Also listen for PASSWORD_RECOVERY event
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === "PASSWORD_RECOVERY") {
                setView("update-password");
            }
        });
        return () => subscription.unsubscribe();
    }, []);

    const loginForm = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { email: "", password: "" },
    });

    const resetForm = useForm<z.infer<typeof resetEmailSchema>>({
        resolver: zodResolver(resetEmailSchema),
        defaultValues: { email: "" },
    });

    const newPasswordForm = useForm<z.infer<typeof newPasswordSchema>>({
        resolver: zodResolver(newPasswordSchema),
        defaultValues: { password: "", confirmPassword: "" },
    });

    async function onLogin(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: values.email,
                password: values.password,
            });
            if (error) throw error;
            navigate("/");
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Erro ao entrar",
                description: error.message || "Verifique suas credenciais",
            });
        } finally {
            setIsLoading(false);
        }
    }

    async function onResetEmail(values: z.infer<typeof resetEmailSchema>) {
        setIsLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
                redirectTo: `${window.location.origin}/auth`,
            });
            if (error) throw error;
            toast({
                title: "Email enviado!",
                description: "Verifique sua caixa de entrada para redefinir a senha.",
            });
            setView("auth");
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Erro ao enviar email",
                description: error.message,
            });
        } finally {
            setIsLoading(false);
        }
    }

    async function onUpdatePassword(values: z.infer<typeof newPasswordSchema>) {
        setIsLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: values.password,
            });
            if (error) throw error;
            toast({
                title: "Senha atualizada!",
                description: "Sua senha foi redefinida com sucesso.",
            });
            navigate("/");
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Erro ao atualizar senha",
                description: error.message,
            });
        } finally {
            setIsLoading(false);
        }
    }

    // ── Update Password View ──
    if (view === "update-password") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                            <KeyRound className="w-6 h-6 text-primary" />
                        </div>
                        <CardTitle className="text-2xl font-bold">Nova Senha</CardTitle>
                        <CardDescription>
                            Digite sua nova senha abaixo
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...newPasswordForm}>
                            <form onSubmit={newPasswordForm.handleSubmit(onUpdatePassword)} className="space-y-4">
                                <FormField
                                    control={newPasswordForm.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nova Senha</FormLabel>
                                            <FormControl>
                                                <Input type="password" placeholder="Mínimo 6 caracteres" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={newPasswordForm.control}
                                    name="confirmPassword"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Confirmar Senha</FormLabel>
                                            <FormControl>
                                                <Input type="password" placeholder="Repita a senha" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button type="submit" className="w-full" disabled={isLoading}>
                                    {isLoading ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Atualizando...</>
                                    ) : (
                                        "Atualizar Senha"
                                    )}
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // ── Forgot Password View ──
    if (view === "forgot") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                            <Mail className="w-6 h-6 text-primary" />
                        </div>
                        <CardTitle className="text-2xl font-bold">Esqueci a Senha</CardTitle>
                        <CardDescription>
                            Enviaremos um link para redefinir sua senha
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...resetForm}>
                            <form onSubmit={resetForm.handleSubmit(onResetEmail)} className="space-y-4">
                                <FormField
                                    control={resetForm.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email</FormLabel>
                                            <FormControl>
                                                <Input placeholder="seu@email.com" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button type="submit" className="w-full" disabled={isLoading}>
                                    {isLoading ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enviando...</>
                                    ) : (
                                        "Enviar Link de Recuperação"
                                    )}
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                    <CardFooter className="flex justify-center">
                        <Button variant="ghost" size="sm" onClick={() => setView("auth")} className="text-muted-foreground">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Voltar ao login
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    // ── Default: Login / Signup ──
    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold">Campaign Creator Hub</CardTitle>
                    <CardDescription>
                        Gerencie suas campanhas de forma inteligente
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="login" className="w-full">

                        <TabsContent value="login">
                            <Form {...loginForm}>
                                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                                    <FormField
                                        control={loginForm.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Email</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="seu@email.com" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={loginForm.control}
                                        name="password"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Senha</FormLabel>
                                                <FormControl>
                                                    <Input type="password" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button type="submit" className="w-full" disabled={isLoading}>
                                        {isLoading ? "Entrando..." : "Entrar"}
                                    </Button>
                                    <div className="text-center">
                                        <button
                                            type="button"
                                            onClick={() => setView("forgot")}
                                            className="text-sm text-primary hover:underline"
                                        >
                                            Esqueci minha senha
                                        </button>
                                    </div>
                                </form>
                            </Form>
                        </TabsContent>
                    </Tabs>
                </CardContent>
                <CardFooter className="flex justify-center text-sm text-muted-foreground">
                    Protegido por Supabase Auth
                </CardFooter>
            </Card>
        </div>
    );
}

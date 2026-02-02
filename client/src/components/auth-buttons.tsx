import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { SiGithub, SiGoogle } from "react-icons/si";
import { LogOut, History, User, Mail, Loader2 } from "lucide-react";
import { Link } from "wouter";

export function AuthButtons() {
  const { user, isLoading, login, loginWithEmail, register, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authConfig, setAuthConfig] = useState<{ githubEnabled: boolean; googleEnabled: boolean } | null>(null);

  useEffect(() => {
    fetch('/api/auth/config')
      .then(res => res.json())
      .then(config => setAuthConfig(config))
      .catch(err => {
        console.error('Failed to fetch auth config:', err);
        // Fallback: disable OAuth if config fetch fails
        setAuthConfig({ githubEnabled: false, googleEnabled: false });
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const result = isRegister 
        ? await register(email, password, name || undefined)
        : await loginWithEmail(email, password);

      if (result.success) {
        setIsOpen(false);
        setEmail("");
        setPassword("");
        setName("");
      } else {
        setError(result.error || "エラーが発生しました");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setName("");
    setError("");
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        {authConfig?.githubEnabled && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => login("github")}
            className="gap-2"
            data-testid="button-login-github"
          >
            <SiGithub className="h-4 w-4" />
            <span className="hidden sm:inline">GitHub</span>
          </Button>
        )}
        {authConfig?.googleEnabled && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => login("google")}
            className="gap-2"
            data-testid="button-login-google"
          >
            <SiGoogle className="h-4 w-4" />
            <span className="hidden sm:inline">Google</span>
          </Button>
        )}
        
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button
              variant="default"
              size="sm"
              className="gap-2"
              data-testid="button-login-email"
            >
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">メール</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{isRegister ? "新規登録" : "ログイン"}</DialogTitle>
              <DialogDescription>
                {isRegister 
                  ? "メールアドレスとパスワードで新規登録" 
                  : "メールアドレスとパスワードでログイン"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegister && (
                <div className="space-y-2">
                  <Label htmlFor="name">名前（任意）</Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="山田太郎"
                    data-testid="input-name"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  required
                  data-testid="input-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">パスワード</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isRegister ? "8文字以上" : "パスワード"}
                  required
                  minLength={isRegister ? 8 : undefined}
                  data-testid="input-password"
                />
              </div>
              {error && (
                <p className="text-sm text-destructive" data-testid="text-error">{error}</p>
              )}
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting}
                data-testid="button-submit-auth"
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isRegister ? "登録" : "ログイン"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                {isRegister ? (
                  <>
                    既にアカウントをお持ちですか？{" "}
                    <button
                      type="button"
                      className="text-primary underline-offset-4 hover:underline"
                      onClick={() => { setIsRegister(false); setError(""); }}
                      data-testid="button-switch-to-login"
                    >
                      ログイン
                    </button>
                  </>
                ) : (
                  <>
                    アカウントをお持ちでないですか？{" "}
                    <button
                      type="button"
                      className="text-primary underline-offset-4 hover:underline"
                      onClick={() => { setIsRegister(true); setError(""); }}
                      data-testid="button-switch-to-register"
                    >
                      新規登録
                    </button>
                  </>
                )}
              </p>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-user-menu">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar_url} alt={user.name} />
            <AvatarFallback>
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="flex items-center gap-2 p-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar_url} alt={user.name} />
            <AvatarFallback>
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{user.name}</span>
            <span className="text-xs text-muted-foreground">{user.email}</span>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/history" className="flex items-center gap-2 cursor-pointer" data-testid="link-history">
            <History className="h-4 w-4" />
            履歴
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} className="text-destructive cursor-pointer" data-testid="button-logout">
          <LogOut className="h-4 w-4 mr-2" />
          ログアウト
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

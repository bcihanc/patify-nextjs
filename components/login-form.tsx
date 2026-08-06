'use client'

import {cn} from '@/lib/utils'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {SubmitButton} from '@/components/submit-button'
import {FormMessage, Message} from '@/components/form-message'
import {useState} from 'react'
import Link from 'next/link'
import {Eye, EyeOff, Lock, Mail} from 'lucide-react'
import {appleSignInAction, googleSignInAction, signInAction} from "@/app/actions";

export function LoginForm({
    className,
    searchParams,
    next,
    ...props
}: React.ComponentPropsWithoutRef<'div'> & {searchParams: Message; next?: string}) {
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    const handleGoogleSocialLogin = async () => {
        setIsLoading(true)
        setError(null)

        try {
            const url = await googleSignInAction(next);
            window.location.href = url;
        } catch (error: unknown) {
            setError(error instanceof Error ? error.message : 'Bir hata oluştu')
            setIsLoading(false)
        }
    }

    const handleAppleSocialLogin = async () => {
        setIsLoading(true)
        setError(null)

        try {
            const url = await appleSignInAction(next);
            window.location.href = url;
        } catch (error: unknown) {
            setError(error instanceof Error ? error.message : 'Bir hata oluştu')
            setIsLoading(false)
        }
    }

    return (
        <div className={cn('flex flex-col gap-8', className)} {...props}>
            {/* Marka — gerçek uygulama ikonu, mobil giriş ekranı hissi için squircle tile */}
            <div className="flex flex-col items-center gap-4 text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src="/images/app_icon.png"
                    alt="Patify"
                    className="h-20 w-20 rounded-[22px] shadow-xs ring-1 ring-border"
                />
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight">Hoş geldin!</h1>
                    <p className="text-sm text-muted-foreground">Devam etmek için hesabına giriş yap</p>
                </div>
            </div>

            <form className="flex flex-col gap-4">
                <input type="hidden" name="next" value={next ?? ''} />

                <div className="space-y-1.5">
                    <Label htmlFor="email" className="sr-only">E-posta</Label>
                    <div className="relative">
                        <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            placeholder="E-posta"
                            className="h-11 pl-10"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="password" className="sr-only">Şifre</Label>
                    <div className="relative">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            id="password"
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="current-password"
                            placeholder="Şifre"
                            className="h-11 pl-10 pr-10"
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                            className="absolute right-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                    </div>
                </div>

                <div className="flex justify-end -mt-1">
                    <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                        Şifreni mi unuttun?
                    </Link>
                </div>

                <SubmitButton formAction={signInAction} className="h-11 w-full" pendingText="Giriş yapılıyor...">
                    Giriş yap
                </SubmitButton>
                <FormMessage message={searchParams}/>
            </form>

            <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border"/>
                <span className="text-xs text-muted-foreground">veya</span>
                <div className="h-px flex-1 bg-border"/>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex flex-col gap-3">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleGoogleSocialLogin()}
                    className="h-11 w-full"
                    disabled={isLoading}
                >
                    <GoogleIcon />
                    Google ile devam et
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleAppleSocialLogin()}
                    className="h-11 w-full"
                    disabled={isLoading}
                >
                    <AppleIcon />
                    Apple ile devam et
                </Button>
            </div>

            <p className="text-center text-sm text-muted-foreground">
                Hesabın yok mu?{' '}
                <Link href="/sign-up" className="font-medium text-primary hover:underline">
                    Kayıt ol
                </Link>
            </p>
        </div>
    )
}

// Marka logoları — lucide'de yok, resmi renklerle inline SVG.
function GoogleIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
        </svg>
    )
}

function AppleIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.05 12.53c-.02-2.2 1.8-3.26 1.88-3.31-1.02-1.5-2.62-1.7-3.19-1.72-1.36-.14-2.65.8-3.34.8-.68 0-1.75-.78-2.87-.76-1.48.02-2.84.86-3.6 2.18-1.53 2.66-.39 6.6 1.1 8.76.73 1.06 1.6 2.25 2.74 2.2 1.1-.04 1.51-.71 2.84-.71 1.32 0 1.69.71 2.85.69 1.18-.02 1.92-1.08 2.64-2.14.83-1.22 1.18-2.4 1.2-2.46-.03-.01-2.3-.88-2.32-3.5zM14.87 5.99c.6-.73 1.01-1.75.9-2.76-.87.03-1.92.58-2.55 1.31-.56.64-1.05 1.68-.92 2.67.97.08 1.96-.5 2.57-1.22z"/>
        </svg>
    )
}

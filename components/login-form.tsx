'use client'

import {cn} from '@/lib/utils'
import {Button} from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {SubmitButton} from '@/components/submit-button'
import {FormMessage, Message} from '@/components/form-message'
import {useState} from 'react'
import Link from 'next/link'
import {appleSignInAction, googleSignInAction, signInAction} from "@/app/actions";

export function LoginForm({
    className,
    searchParams,
    ...props
}: React.ComponentPropsWithoutRef<'div'> & {searchParams: Message}) {
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    const handleGoogleSocialLogin = async () => {
        setIsLoading(true)
        setError(null)

        try {
            const url = await googleSignInAction();
            window.location.href = url;
        } catch (error: unknown) {
            setError(error instanceof Error ? error.message : 'An error occurred')
            setIsLoading(false)
        }
    }

    const handleAppleSocialLogin = async () => {
        setIsLoading(true)
        setError(null)

        try {
            const url = await appleSignInAction();
            window.location.href = url;
        } catch (error: unknown) {
            setError(error instanceof Error ? error.message : 'An error occurred')
            setIsLoading(false)
        }
    }

    return (
        <div className={cn('flex flex-col gap-5', className)} {...props}>
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">Welcome!</CardTitle>
                    <CardDescription>Sign in to your account to continue</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-6">
                        <form className="flex flex-col gap-3">
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="email">E-posta</Label>
                                <Input id="email" name="email" type="email" placeholder="john@patify.net" required/>
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="password">Şifre</Label>
                                <Input id="password" name="password" type="password" placeholder="Şifreniz" required/>
                            </div>
                            <SubmitButton formAction={signInAction} className="w-full" pendingText="Giriş yapılıyor...">
                                Giriş yap
                            </SubmitButton>
                            <FormMessage message={searchParams}/>
                        </form>

                        <div className="flex flex-col gap-1 text-sm text-center">
                            <Link href="/forgot-password" className="text-primary underline">
                                Şifreni mi unuttun?
                            </Link>
                            <span className="text-muted-foreground">
                                Hesabın yok mu?{' '}
                                <Link href="/sign-up" className="text-primary font-medium underline">
                                    Kayıt ol
                                </Link>
                            </span>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="h-px flex-1 bg-border"/>
                            <span className="text-xs text-muted-foreground">veya</span>
                            <div className="h-px flex-1 bg-border"/>
                        </div>

                        {error && <p className="text-sm text-destructive-500">{error}</p>}
                        <Button
                            onClick={() => handleGoogleSocialLogin()}
                            className="w-full"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Logging in...' : 'Google ile devam et'}
                        </Button>
                        <Button
                            onClick={() => handleAppleSocialLogin()}
                            className="w-full"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Logging in...' : 'Continue with Apple'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

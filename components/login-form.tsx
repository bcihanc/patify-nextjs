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
import {useState} from 'react'
import {createClient} from "@/lib/supabase/client";

export function LoginForm({className, ...props}: React.ComponentPropsWithoutRef<'div'>) {
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    const handleSocialLogin = async (provider: 'google' | 'apple') => {
        const supabase = createClient()
        setIsLoading(true)
        setError(null)

        try {
            const {error} = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: "https://api.patify.net/auth/v1/callback",
                },
            })

            if (error) throw error
        } catch (error: unknown) {
            setError(error instanceof Error ? error.message : 'An error occurred')
            setIsLoading(false)
        }
    }

    return (
        <div className={cn('flex flex-col gap-6', className)} {...props}>
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">Welcome!</CardTitle>
                    <CardDescription>Sign in to your account to continue</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-6">
                        {error && <p className="text-sm text-destructive-500">{error}</p>}
                        <Button
                            onClick={() => handleSocialLogin('google')}
                            className="w-full"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Logging in...' : 'Continue with Google'}
                        </Button>
                        <Button
                            onClick={() => handleSocialLogin('apple')}
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

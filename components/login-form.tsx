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
import {appleSignInAction, googleSignInAction} from "@/app/actions";

export function LoginForm({className, ...props}: React.ComponentPropsWithoutRef<'div'>) {
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

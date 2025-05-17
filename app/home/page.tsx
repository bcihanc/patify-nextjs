import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { deleteAccountAction } from "../actions";

export default async function ProtectedPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return redirect("/sign-in");
    }

    return (
        <div className="flex-1 w-full flex flex-col gap-12">
            <Dialog>
                <DialogTrigger asChild>
                    <Button variant={"destructive"}>
                        Delete Account
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Account</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete your account? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <form action={deleteAccountAction} className="w-full">
                        <DialogFooter>
                            <Button type="submit" variant="destructive">
                                Yes, delete my account
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            {/*<div className="w-full">*/}
            {/*  <div className="bg-accent text-sm p-3 px-5 rounded-md text-foreground flex gap-3 items-center">*/}
            {/*    <InfoIcon size="16" strokeWidth={2} />*/}
            {/*    This is a home page that you can only see as an authenticated*/}
            {/*    user*/}
            {/*  </div>*/}
            {/*</div>*/}
            {/*<div className="flex flex-col gap-2 items-start">*/}
            {/*  <h2 className="font-bold text-2xl mb-4">Your user details</h2>*/}
            {/*  <pre className="text-xs font-mono p-3 rounded border max-h-32 overflow-auto">*/}
            {/*    {JSON.stringify(user, null, 2)}*/}
            {/*  </pre>*/}
            {/*</div>*/}
            {/*<div>*/}
            {/*  <h2 className="font-bold text-2xl mb-4">Next steps</h2>*/}
            {/*  <FetchDataSteps />*/}
            {/*</div>*/}
        </div>
    );
}

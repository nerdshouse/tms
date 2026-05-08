import { redirect } from "next/navigation";

/** Auth is now handled entirely on the login page via Google popup.
 *  Any old magic-link URLs that land here are redirected to login. */
export default function AuthCallbackPage() {
  redirect("/login");
}

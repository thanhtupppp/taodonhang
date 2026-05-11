import { Suspense } from "react";
import LoginForm from "./login-form";

export default function AdminLoginPage() {
  return (
    <main className="container auth-shell">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}

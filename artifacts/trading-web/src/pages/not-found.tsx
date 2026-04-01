import { Link } from "wouter";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="text-6xl mb-4">🤖</div>
      <h1 className="text-3xl font-bold text-foreground mb-2">404</h1>
      <p className="text-muted-foreground mb-6">Page not found</p>
      <Link href="/">
        <button className="btn-primary flex items-center gap-2">
          <Home className="w-4 h-4" /> Go to Dashboard
        </button>
      </Link>
    </div>
  );
}

// app/layout.tsx — Root layout with boot.dev-style navigation
import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Learn to Code — Interactive Programming Courses",
  description: "Master backend development with interactive coding lessons in Python, Go, TypeScript, SQL, and more.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-gray-950 text-gray-100 antialiased">
        <nav className="h-14 bg-gray-900 border-b border-gray-800 flex items-center px-6 sticky top-0 z-50">
          {/* Logo */}
          <Link href="/" className="font-bold text-lg text-yellow-400 mr-8 shrink-0">
            <span className="text-gray-500">&lt;/&gt;</span> boot.dev
          </Link>

          {/* Main nav */}
          <div className="flex gap-1 text-sm">
            <Link href="/courses" className="px-3 py-1.5 text-gray-400 hover:text-white rounded transition-colors">
              Courses
            </Link>
            <Link href="/training" className="px-3 py-1.5 text-gray-400 hover:text-white rounded transition-colors">
              Training
            </Link>
          </div>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-3">
            <Link href="/playground" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
              Playground
            </Link>
            <Link
              href="/paths/backend-python-golang"
              className="px-4 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-gray-950 rounded-lg font-semibold text-sm transition-all"
            >
              Start Learning
            </Link>
          </div>
        </nav>

        {children}

        {/* Footer */}
        <footer className="bg-gray-900 border-t border-gray-800 py-12 px-4 mt-16">
          <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-8 text-sm text-gray-400">
            <div>
              <h4 className="text-gray-200 font-semibold mb-3 text-xs uppercase tracking-wider">Platform</h4>
              <div className="space-y-2">
                <Link href="/courses" className="block hover:text-white transition-colors">All Courses</Link>
                <Link href="/training" className="block hover:text-white transition-colors">Training Grounds</Link>
                <Link href="/playground" className="block hover:text-white transition-colors">Playground</Link>
              </div>
            </div>
            <div>
              <h4 className="text-gray-200 font-semibold mb-3 text-xs uppercase tracking-wider">Paths</h4>
              <div className="space-y-2">
                <Link href="/paths/backend-python-golang" className="block hover:text-white transition-colors">Backend (Python + Go)</Link>
                <Link href="/paths/backend-python-typescript" className="block hover:text-white transition-colors">Backend (Python + TS)</Link>
                <Link href="/paths/devops-python-golang" className="block hover:text-white transition-colors">DevOps (Python + Go)</Link>
              </div>
            </div>
            <div>
              <h4 className="text-gray-200 font-semibold mb-3 text-xs uppercase tracking-wider">Languages</h4>
              <div className="space-y-2">
                <Link href="/courses/learn-code-python" className="block hover:text-white transition-colors">Python</Link>
                <Link href="/courses/learn-golang" className="block hover:text-white transition-colors">Go</Link>
                <Link href="/courses/learn-typescript" className="block hover:text-white transition-colors">TypeScript</Link>
                <Link href="/courses/learn-sql" className="block hover:text-white transition-colors">SQL</Link>
              </div>
            </div>
            <div>
              <h4 className="text-gray-200 font-semibold mb-3 text-xs uppercase tracking-wider">Subjects</h4>
              <div className="space-y-2">
                <Link href="/courses/learn-linux" className="block hover:text-white transition-colors">Linux</Link>
                <Link href="/courses/learn-docker" className="block hover:text-white transition-colors">Docker</Link>
                <Link href="/courses/learn-kubernetes" className="block hover:text-white transition-colors">Kubernetes</Link>
                <Link href="/courses/learn-git" className="block hover:text-white transition-colors">Git</Link>
                <Link href="/courses/learn-algorithms" className="block hover:text-white transition-colors">Algorithms</Link>
                <Link href="/courses/learn-cryptography-golang" className="block hover:text-white transition-colors">Cryptography</Link>
              </div>
            </div>
          </div>
          <div className="max-w-6xl mx-auto mt-8 pt-8 border-t border-gray-800 text-center text-sm text-gray-600">
            <p>Free, open-source coding education. No paywalls. No gamification. Just learning.</p>
            <p className="mt-1">
              <a href="https://github.com/p4ndish/boot.dev.free" className="hover:text-gray-400 transition-colors">
                github.com/p4ndish/boot.dev.free
              </a>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}

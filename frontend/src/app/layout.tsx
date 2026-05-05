// app/layout.tsx — Root layout with navbar and footer
import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Learn to Code — Interactive Programming Courses",
  description:
    "Master backend development with interactive coding lessons in Python, Go, TypeScript, SQL, and more.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-gray-950 text-gray-100 antialiased">
        {/* Navbar */}
        <nav className="h-14 bg-gray-900 border-b border-gray-800 flex items-center px-6 sticky top-0 z-50">
          <Link href="/" className="font-bold text-xl text-yellow-400 mr-8">
            &lt;/&gt; boot.dev
          </Link>
          <div className="flex gap-6 text-sm">
            <Link href="/courses" className="text-gray-400 hover:text-white transition-colors">
              Courses
            </Link>
            <Link href="/training" className="text-gray-400 hover:text-white transition-colors">
              Training
            </Link>
            <Link href="/paths/backend-python-golang" className="text-gray-400 hover:text-white transition-colors">
              Backend Path
            </Link>
            <Link href="/paths/devops-python-golang" className="text-gray-400 hover:text-white transition-colors">
              DevOps Path
            </Link>
          </div>
          <div className="ml-auto flex gap-4">
            <Link href="/playground" className="text-gray-400 hover:text-white text-sm">
              Playground
            </Link>
            <Link href="/paths/backend-python-golang" className="text-yellow-500 hover:text-yellow-400 text-sm font-semibold">
              Start Learning
            </Link>
          </div>
        </nav>

        {children}

        {/* Footer */}
        <footer className="bg-gray-900 border-t border-gray-800 py-12 px-4 mt-16">
          <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8 text-sm text-gray-400">
            <div>
              <h4 className="text-gray-200 font-semibold mb-3">Platform</h4>
              <div className="space-y-2">
                <Link href="/courses" className="block hover:text-white">All Courses</Link>
                <Link href="/paths/backend-python-golang" className="block hover:text-white">Backend Path</Link>
                <Link href="/paths/devops-python-golang" className="block hover:text-white">DevOps Path</Link>
              </div>
            </div>
            <div>
              <h4 className="text-gray-200 font-semibold mb-3">Languages</h4>
              <div className="space-y-2">
                <Link href="/courses/learn-code-python" className="block hover:text-white">Python</Link>
                <Link href="/courses/learn-golang" className="block hover:text-white">Go</Link>
                <Link href="/courses/learn-typescript" className="block hover:text-white">TypeScript</Link>
                <Link href="/courses/learn-sql" className="block hover:text-white">SQL</Link>
              </div>
            </div>
            <div>
              <h4 className="text-gray-200 font-semibold mb-3">Subjects</h4>
              <div className="space-y-2">
                <Link href="/courses/learn-linux" className="block hover:text-white">Linux</Link>
                <Link href="/courses/learn-docker" className="block hover:text-white">Docker</Link>
                <Link href="/courses/learn-kubernetes" className="block hover:text-white">Kubernetes</Link>
                <Link href="/courses/learn-git" className="block hover:text-white">Git</Link>
              </div>
            </div>
          </div>
          <div className="max-w-6xl mx-auto mt-8 pt-8 border-t border-gray-800 text-center text-sm text-gray-600">
            <p>Free and open-source. Built by the community.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}

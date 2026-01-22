"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Lock, User } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: username.includes("@") ? undefined : username, email: username.includes("@") ? username : undefined, password }),
      });

      if (response.ok) {
        const data = await response.json();
        const cookieValue = `auth-token=${data.token}; path=/; max-age=86400; SameSite=Lax`;
        document.cookie = cookieValue;
        router.push("/write-checks");
      } else {
        // Try to get error message from response
        let errorMessage = `Login failed (${response.status})`;
        
        try {
          // Read response as text first (safer than JSON.parse on potentially consumed body)
          const text = await response.text();
          console.log("Login error - raw response text:", text);
          console.log("Login error - response status:", response.status);
          
          if (text && text.trim()) {
            try {
              const errorData = JSON.parse(text);
              // Check if we actually got valid data
              if (errorData && typeof errorData === 'object' && Object.keys(errorData).length > 0) {
                errorMessage = errorData.error || errorData.message || errorMessage;
                console.error("Login error - parsed JSON:", errorData);
              } else {
                // Empty object - use status-based defaults
                if (response.status === 401) {
                  errorMessage = "Invalid username or password";
                } else if (response.status === 400) {
                  errorMessage = "Invalid request. Please check your input.";
                }
                console.error("Login error - parsed empty object, using status-based message");
              }
            } catch (parseError) {
              // Response is text but not JSON - use the text as error message
              errorMessage = text.trim() || errorMessage;
              console.error("Login error - not valid JSON, using text:", text);
            }
          } else {
            // Empty or whitespace-only response body - use status-based defaults
            if (response.status === 401) {
              errorMessage = "Invalid username or password";
            } else if (response.status === 400) {
              errorMessage = "Invalid request. Please check your input.";
            }
            console.error("Login error - empty response body, using status-based message");
          }
        } catch (readError) {
          // If we can't read the response at all, use status-based defaults
          if (response.status === 401) {
            errorMessage = "Invalid username or password";
          } else if (response.status === 400) {
            errorMessage = "Invalid request. Please check your input.";
          }
          console.error("Login error - could not read response:", readError);
        }
        
        setError(errorMessage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred. Please try again.";
      console.error("Login request failed:", err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">QT Office</CardTitle>
          <CardDescription>
            Sign in to your Check Printing System account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium">
                Username or Email
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username or email"
                  className="pl-9"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  className="pl-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
import React from "react";
import { HeroUIProvider } from "@heroui/react";
import TotpCard from "./components/TotpCard.jsx";

const App = () => {
  return (
    <HeroUIProvider>
      <main className="min-h-screen p-8 bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-center mb-8 text-white">2FA Password Center</h1>
          
          <div className="flex flex-wrap gap-6 justify-center">
            <TotpCard
              name="Example Service"
              platform="example.com"
              description="This is an example TOTP service."
              color="primary"
              onGenerate={async () => {
                // Simulate TOTP code generation
                await new Promise(resolve => setTimeout(resolve, 500));
                return Math.floor(Math.random() * 900000 + 100000).toString();
              }}
              onDelete={() => {
                // Handle delete action
                console.log("TOTP key deleted");
              }}
            />
            
            <TotpCard
              name="GitHub"
              platform="github.com"
              description="Code repository access"
              color="success"
              onGenerate={async () => {
                await new Promise(resolve => setTimeout(resolve, 500));
                return Math.floor(Math.random() * 900000 + 100000).toString();
              }}
              onDelete={() => {
                console.log("GitHub TOTP deleted");
              }}
            />
            
            <TotpCard
              name="Google"
              platform="google.com"
              description="Gmail & Google services"
              color="warning"
              onGenerate={async () => {
                await new Promise(resolve => setTimeout(resolve, 500));
                return Math.floor(Math.random() * 900000 + 100000).toString();
              }}
              onDelete={() => {
                console.log("Google TOTP deleted");
              }}
            />
          </div>
        </div>
      </main>
    </HeroUIProvider>
  );
};

export default App;
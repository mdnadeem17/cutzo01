import { useEffect } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useNavigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const BackButtonHandler = () => {
  const location = useLocation();

  useEffect(() => {
    const backButtonListener = CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      console.log('Native Back Button Pressed', { pathname: location.pathname, canGoBack });
      
      // If web history has pages, always go back
      if (canGoBack) {
        window.history.back();
      } 
      // ONLY exit if we are at the root path AND no web history left
      else if (location.pathname === '/') {
        console.log('Exiting App from Home');
        CapacitorApp.exitApp();
      }
      // Otherwise, ignore (prevents exit on overlays/Google picker)
    });

    return () => {
      backButtonListener.then(l => l.remove());
    };
  }, [location.pathname]);

  return null;
};

const AppUrlListener = () => {
  useEffect(() => {
    const urlListener = CapacitorApp.addListener('appUrlOpen', (event) => {
      const customScheme = 'com.trimo.app://';
      if (event.url.startsWith(customScheme)) {
        // Extract the path and query (e.g. /?code=....) and trick the WebView into navigating to it
        const pathAndQuery = event.url.substring(customScheme.length - 1);
        window.location.href = pathAndQuery;
      }
    });

    return () => {
      urlListener.then(l => l.remove());
    };
  }, []);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <BackButtonHandler />
        <AppUrlListener />
        <Routes>
          <Route path="/" element={<Index />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

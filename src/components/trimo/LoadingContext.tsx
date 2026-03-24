import { AnimatePresence, motion } from "framer-motion";
import { createContext, ReactNode, useContext, useState } from "react";

interface LoadingContextType {
  showLoading: (message?: string) => void;
  hideLoading: () => void;
  isLoading: boolean;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [loadingState, setLoadingState] = useState<{
    isLoading: boolean;
    message?: string;
  }>({ isLoading: false });

  const showLoading = (message?: string) => {
    setLoadingState({ isLoading: true, message });
  };

  const hideLoading = () => {
    setLoadingState({ isLoading: false });
  };

  return (
    <LoadingContext.Provider value={{ showLoading, hideLoading, isLoading: loadingState.isLoading }}>
      {children}
      
      <AnimatePresence>
        {loadingState.isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 px-4 backdrop-blur-md pointer-events-none"
          >
            <div className="flex space-x-2">
              <div className="h-3 w-3 rounded-full bg-primary dot-wave" style={{ animationDelay: "0s" }} />
              <div className="h-3 w-3 rounded-full bg-primary dot-wave" style={{ animationDelay: "0.15s" }} />
              <div className="h-3 w-3 rounded-full bg-primary dot-wave" style={{ animationDelay: "0.3s" }} />
            </div>
            
            {loadingState.message && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mt-6 text-center text-sm font-semibold text-foreground"
              >
                {loadingState.message}
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error("useLoading must be used within a LoadingProvider");
  }
  return context;
}

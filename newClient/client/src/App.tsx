import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import MovieDetailModal from "./components/MovieDetailModal";
import ChatbotPanel from "./components/chatbot/ChatbotPanel";
import { MovieModalProvider } from "./contexts/MovieModalContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { FavoritesProvider } from "./contexts/FavoritesContext";
import { CastSearchProvider } from "./contexts/CastSearchContext";
import queryClient from "./lib/query-client";
import Home from "./pages/Home";
import MovieDetails from "./pages/MovieDetails";
import FavoritesPage from "./pages/FavoritesPage";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/favorites"} component={FavoritesPage} />
      <Route path={"/movie/:id"} component={MovieDetails} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="dark">
          <FavoritesProvider>
            <CastSearchProvider>
              <MovieModalProvider>
                <TooltipProvider>
                  <Toaster />
                  <Router />
                  <MovieDetailModal />
                  <ChatbotPanel />
                </TooltipProvider>
              </MovieModalProvider>
            </CastSearchProvider>
          </FavoritesProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;



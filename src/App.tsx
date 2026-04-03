import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminProtectedRoute } from "@/components/admin/AdminProtectedRoute";
import { isNativeApp } from "@/hooks/useIsNativeApp";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Login from "./pages/Login.tsx";
import Signup from "./pages/Signup.tsx";
import ForgotPassword from "./pages/ForgotPassword.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import Questionnaire from "./pages/Questionnaire.tsx";
import SampleMealPlan from "./pages/SampleMealPlan.tsx";
import LegalPage from "./pages/legal/LegalPage.tsx";
import NativeAuth from "./pages/NativeAuth.tsx";
import NativeSplash from "./pages/NativeSplash.tsx";
import DashboardLayout from "./pages/dashboard/DashboardLayout.tsx";
import DashboardHome from "./pages/dashboard/DashboardHome.tsx";
import MealPlanPage from "./pages/dashboard/MealPlanPage.tsx";
import GroceryListPage from "./pages/dashboard/GroceryListPage.tsx";
import PantryPage from "./pages/dashboard/PantryPage.tsx";
import RecipesPage from "./pages/dashboard/RecipesPage.tsx";
import BudgetInsightsPage from "./pages/dashboard/BudgetInsightsPage.tsx";
import FridgeChefPage from "./pages/dashboard/FridgeChefPage.tsx";
import SettingsPage from "./pages/dashboard/SettingsPage.tsx";
import SupportPage from "./pages/dashboard/SupportPage.tsx";
import AdminLayout from "./pages/admin/AdminLayout.tsx";
import AdminLogin from "./pages/admin/AdminLogin.tsx";
import AdminDashboard from "./pages/admin/AdminDashboard.tsx";
import AdminMembers from "./pages/admin/AdminMembers.tsx";
import AdminMealPlans from "./pages/admin/AdminMealPlans.tsx";
import AdminRecipes from "./pages/admin/AdminRecipes.tsx";
import AdminSpecialMeals from "./pages/admin/AdminSpecialMeals.tsx";
import AdminMarketing from "./pages/admin/AdminMarketing.tsx";
import AdminAnalytics from "./pages/admin/AdminAnalytics.tsx";
import AdminManagement from "./pages/admin/AdminManagement.tsx";
import AdminSettings from "./pages/admin/AdminSettings.tsx";
import AdminVerifications from "./pages/admin/AdminVerifications.tsx";

const queryClient = new QueryClient();

function NativeRedirectHome() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <img src="/favicon.png" alt="Loading" className="h-10 w-10 animate-float" />
      </div>
    );
  }
  return <Navigate to={user ? "/dashboard" : "/auth"} replace />;
}

const App = () => {
  const native = isNativeApp();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Homepage: native app → redirect to /auth, web → marketing page */}
              <Route path="/" element={native ? <NativeRedirectHome /> : <Index />} />

              {/* Native auth screen */}
              <Route path="/auth" element={<NativeAuth />} />

              <Route path="/sample-plan/:slug" element={<SampleMealPlan />} />
              <Route path="/page/:slug" element={<LegalPage />} />
              <Route path="/login" element={native ? <Navigate to="/auth" replace /> : <Login />} />
              <Route path="/signup" element={native ? <Navigate to="/auth" replace /> : <Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/questionnaire" element={<ProtectedRoute><Questionnaire /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                <Route index element={<DashboardHome />} />
                <Route path="meal-plan" element={<MealPlanPage />} />
                <Route path="grocery-list" element={<GroceryListPage />} />
                <Route path="pantry" element={<PantryPage />} />
                <Route path="fridge-chef" element={<FridgeChefPage />} />
                <Route path="recipes" element={<RecipesPage />} />
                <Route path="budget" element={<BudgetInsightsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="support" element={<SupportPage />} />
              </Route>
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminProtectedRoute><AdminLayout /></AdminProtectedRoute>}>
                <Route index element={<AdminDashboard />} />
                <Route path="members" element={<AdminMembers />} />
                <Route path="meal-plans" element={<AdminMealPlans />} />
                <Route path="recipes" element={<AdminRecipes />} />
                <Route path="special-meals" element={<AdminSpecialMeals />} />
                <Route path="marketing" element={<AdminMarketing />} />
                <Route path="analytics" element={<AdminAnalytics />} />
                <Route path="admins" element={<AdminManagement />} />
                <Route path="verifications" element={<AdminVerifications />} />
                <Route path="settings" element={<AdminSettings />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

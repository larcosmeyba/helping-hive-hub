import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AdminProtectedRoute } from "@/components/admin/AdminProtectedRoute";
import { isNativeApp } from "@/hooks/useIsNativeApp";

// Eager: homepage entry + most-common immediate next clicks.
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import Signup from "./pages/Signup.tsx";

// Lazy: everything else — split into its own chunk so the marketing homepage
// doesn't ship dashboard/admin/Instacart/Capacitor code to visitors.
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword.tsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.tsx"));
const Questionnaire = lazy(() => import("./pages/Questionnaire.tsx"));
const SampleMealPlan = lazy(() => import("./pages/SampleMealPlan.tsx"));
const LegalPage = lazy(() => import("./pages/legal/LegalPage.tsx"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy.tsx"));
const Partners = lazy(() => import("./pages/Partners.tsx"));
const Partnerships = lazy(() => import("./pages/Partnerships.tsx"));
const About = lazy(() => import("./pages/About.tsx"));
const Press = lazy(() => import("./pages/Press.tsx"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe.tsx"));
const NativeAuth = lazy(() => import("./pages/NativeAuth.tsx"));
const NativeSplash = lazy(() => import("./pages/NativeSplash.tsx"));

const DashboardLayout = lazy(() => import("./pages/dashboard/DashboardLayout.tsx"));
const DashboardHome = lazy(() => import("./pages/dashboard/DashboardHome.tsx"));
const MealPlanPage = lazy(() => import("./pages/dashboard/MealPlanPage.tsx"));
const GroceryListPage = lazy(() => import("./pages/dashboard/GroceryListPage.tsx"));
const PantryPage = lazy(() => import("./pages/dashboard/PantryPage.tsx"));
const BudgetInsightsPage = lazy(() => import("./pages/dashboard/BudgetInsightsPage.tsx"));
const FridgeChefPage = lazy(() => import("./pages/dashboard/FridgeChefPage.tsx"));
const SettingsPage = lazy(() => import("./pages/dashboard/SettingsPage.tsx"));
const SupportPage = lazy(() => import("./pages/dashboard/SupportPage.tsx"));
const ResourceHubHome = lazy(() => import("./pages/dashboard/ResourceHubHome.tsx"));
const ResourceCategoryPage = lazy(() => import("./pages/dashboard/ResourceCategoryPage.tsx"));
const ResourceDetailPage = lazy(() => import("./pages/dashboard/ResourceDetailPage.tsx"));
const BulkBuyingGuide = lazy(() => import("./pages/dashboard/BulkBuyingGuide.tsx"));

const AdminLayout = lazy(() => import("./pages/admin/AdminLayout.tsx"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin.tsx"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard.tsx"));
const AdminMembers = lazy(() => import("./pages/admin/AdminMembers.tsx"));
const AdminMealPlans = lazy(() => import("./pages/admin/AdminMealPlans.tsx"));
const AdminRecipes = lazy(() => import("./pages/admin/AdminRecipes.tsx"));
const AdminSpecialMeals = lazy(() => import("./pages/admin/AdminSpecialMeals.tsx"));
const AdminMarketing = lazy(() => import("./pages/admin/AdminMarketing.tsx"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics.tsx"));
const AdminManagement = lazy(() => import("./pages/admin/AdminManagement.tsx"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings.tsx"));
const AdminVerifications = lazy(() => import("./pages/admin/AdminVerifications.tsx"));
const AdminFeedback = lazy(() => import("./pages/admin/AdminFeedback.tsx"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div
      className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
      style={{ borderColor: "#F2B233", borderTopColor: "transparent" }}
      role="status"
      aria-label="Loading"
    />
  </div>
);

const App = () => {
  const native = isNativeApp();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <ErrorBoundary>
          <BrowserRouter>
            <AuthProvider>
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  {/* Homepage: native app → splash screen, web → marketing page */}
                  <Route path="/" element={native ? <NativeSplash /> : <Index />} />

                  {/* Native auth screen */}
                  <Route path="/auth" element={<NativeAuth />} />

                  <Route path="/sample-plan/:slug" element={<SampleMealPlan />} />
                  <Route path="/partners" element={<Partners />} />
                  <Route path="/partnerships" element={<Partnerships />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/press" element={<Press />} />
                  <Route path="/unsubscribe" element={<Unsubscribe />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
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
                    <Route path="budget" element={<BudgetInsightsPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="support" element={<SupportPage />} />
                    <Route path="resources" element={<ResourceHubHome />} />
                    <Route path="resources/bulk-buying" element={<BulkBuyingGuide />} />
                    <Route path="resources/detail/:id" element={<ResourceDetailPage />} />
                    <Route path="resources/:categorySlug" element={<ResourceCategoryPage />} />
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
                    <Route path="feedback" element={<AdminFeedback />} />
                    <Route path="settings" element={<AdminSettings />} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </AuthProvider>
          </BrowserRouter>
        </ErrorBoundary>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

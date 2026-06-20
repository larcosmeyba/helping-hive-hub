export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      _deprecated_meal_plan_items: {
        Row: {
          calories: number | null
          carbs_g: number | null
          created_at: string
          day_of_week: number
          estimated_cost: number | null
          fats_g: number | null
          id: string
          meal_image: string | null
          meal_name: string
          meal_plan_id: string
          meal_type: string
          protein_g: number | null
          recipe_id: string | null
          user_id: string
        }
        Insert: {
          calories?: number | null
          carbs_g?: number | null
          created_at?: string
          day_of_week: number
          estimated_cost?: number | null
          fats_g?: number | null
          id?: string
          meal_image?: string | null
          meal_name: string
          meal_plan_id: string
          meal_type: string
          protein_g?: number | null
          recipe_id?: string | null
          user_id: string
        }
        Update: {
          calories?: number | null
          carbs_g?: number | null
          created_at?: string
          day_of_week?: number
          estimated_cost?: number | null
          fats_g?: number | null
          id?: string
          meal_image?: string | null
          meal_name?: string
          meal_plan_id?: string
          meal_type?: string
          protein_g?: number | null
          recipe_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_items_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      account_deletions: {
        Row: {
          deleted_at: string
          email: string | null
          id: string
          initiated_by: string
          reason: string | null
          user_id: string
        }
        Insert: {
          deleted_at?: string
          email?: string | null
          id?: string
          initiated_by?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          deleted_at?: string
          email?: string | null
          id?: string
          initiated_by?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      admin_permissions: {
        Row: {
          created_at: string
          edit_members: boolean
          edit_settings: boolean
          export_data: boolean
          id: string
          invite_remove_admins: boolean
          manage_marketing: boolean
          manage_meal_plans: boolean
          manage_recipes: boolean
          manage_special_meals: boolean
          updated_at: string
          user_id: string
          view_analytics: boolean
          view_members: boolean
          view_snap_data: boolean
        }
        Insert: {
          created_at?: string
          edit_members?: boolean
          edit_settings?: boolean
          export_data?: boolean
          id?: string
          invite_remove_admins?: boolean
          manage_marketing?: boolean
          manage_meal_plans?: boolean
          manage_recipes?: boolean
          manage_special_meals?: boolean
          updated_at?: string
          user_id: string
          view_analytics?: boolean
          view_members?: boolean
          view_snap_data?: boolean
        }
        Update: {
          created_at?: string
          edit_members?: boolean
          edit_settings?: boolean
          export_data?: boolean
          id?: string
          invite_remove_admins?: boolean
          manage_marketing?: boolean
          manage_meal_plans?: boolean
          manage_recipes?: boolean
          manage_special_meals?: boolean
          updated_at?: string
          user_id?: string
          view_analytics?: boolean
          view_members?: boolean
          view_snap_data?: boolean
        }
        Relationships: []
      }
      ai_config: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          model: string
          notes: string | null
          provider: string
          system_prompt: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          model?: string
          notes?: string | null
          provider?: string
          system_prompt?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          model?: string
          notes?: string | null
          provider?: string
          system_prompt?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ai_request_log: {
        Row: {
          completion_tokens: number | null
          created_at: string
          error_message: string | null
          id: string
          latency_ms: number | null
          metadata: Json
          model_used: string | null
          prompt_tokens: number | null
          provider: string | null
          request_type: string
          status: string
          total_tokens: number | null
          user_id: string | null
        }
        Insert: {
          completion_tokens?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          metadata?: Json
          model_used?: string | null
          prompt_tokens?: number | null
          provider?: string | null
          request_type: string
          status?: string
          total_tokens?: number | null
          user_id?: string | null
        }
        Update: {
          completion_tokens?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          metadata?: Json
          model_used?: string | null
          prompt_tokens?: number | null
          provider?: string | null
          request_type?: string
          status?: string
          total_tokens?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      api_rate_limits: {
        Row: {
          call_count: number
          endpoint: string
          hour_bucket: string
          updated_at: string
          user_id: string
        }
        Insert: {
          call_count?: number
          endpoint: string
          hour_bucket: string
          updated_at?: string
          user_id: string
        }
        Update: {
          call_count?: number
          endpoint?: string
          hour_bucket?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      assistance_needs: {
        Row: {
          created_at: string
          id: string
          needs_childcare: boolean | null
          needs_diapers_formula: boolean | null
          needs_employment: boolean | null
          needs_food_assistance: boolean | null
          needs_healthcare: boolean | null
          needs_housing: boolean | null
          needs_snap: boolean | null
          needs_transportation: boolean | null
          needs_utilities: boolean | null
          needs_wic: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          needs_childcare?: boolean | null
          needs_diapers_formula?: boolean | null
          needs_employment?: boolean | null
          needs_food_assistance?: boolean | null
          needs_healthcare?: boolean | null
          needs_housing?: boolean | null
          needs_snap?: boolean | null
          needs_transportation?: boolean | null
          needs_utilities?: boolean | null
          needs_wic?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          needs_childcare?: boolean | null
          needs_diapers_formula?: boolean | null
          needs_employment?: boolean | null
          needs_food_assistance?: boolean | null
          needs_healthcare?: boolean | null
          needs_housing?: boolean | null
          needs_snap?: boolean | null
          needs_transportation?: boolean | null
          needs_utilities?: boolean | null
          needs_wic?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      budget_ai_insights: {
        Row: {
          created_at: string
          estimated_savings: number | null
          id: string
          insight_type: string
          message: string
          month: string
          related_category: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          estimated_savings?: number | null
          id?: string
          insight_type: string
          message: string
          month: string
          related_category?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          estimated_savings?: number | null
          id?: string
          insight_type?: string
          message?: string
          month?: string
          related_category?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      budget_food_items: {
        Row: {
          brand: string | null
          calories: number | null
          carbs_g: number | null
          category: string | null
          cost_per_serving: number | null
          created_at: string
          estimated_cost: number | null
          expiration_type: string | null
          fat_g: number | null
          food_item: string
          household_size_supported: string | null
          id: string
          is_canned: boolean | null
          is_carbohydrate: boolean | null
          is_dairy: boolean | null
          is_frozen: boolean | null
          is_fruit: boolean | null
          is_protein: boolean | null
          is_shelf_stable: boolean | null
          is_vegetable: boolean | null
          notes: string | null
          protein_g: number | null
          serving_size: string | null
          storage_type: string | null
          store: string | null
          updated_at: string
        }
        Insert: {
          brand?: string | null
          calories?: number | null
          carbs_g?: number | null
          category?: string | null
          cost_per_serving?: number | null
          created_at?: string
          estimated_cost?: number | null
          expiration_type?: string | null
          fat_g?: number | null
          food_item: string
          household_size_supported?: string | null
          id?: string
          is_canned?: boolean | null
          is_carbohydrate?: boolean | null
          is_dairy?: boolean | null
          is_frozen?: boolean | null
          is_fruit?: boolean | null
          is_protein?: boolean | null
          is_shelf_stable?: boolean | null
          is_vegetable?: boolean | null
          notes?: string | null
          protein_g?: number | null
          serving_size?: string | null
          storage_type?: string | null
          store?: string | null
          updated_at?: string
        }
        Update: {
          brand?: string | null
          calories?: number | null
          carbs_g?: number | null
          category?: string | null
          cost_per_serving?: number | null
          created_at?: string
          estimated_cost?: number | null
          expiration_type?: string | null
          fat_g?: number | null
          food_item?: string
          household_size_supported?: string | null
          id?: string
          is_canned?: boolean | null
          is_carbohydrate?: boolean | null
          is_dairy?: boolean | null
          is_frozen?: boolean | null
          is_fruit?: boolean | null
          is_protein?: boolean | null
          is_shelf_stable?: boolean | null
          is_vegetable?: boolean | null
          notes?: string | null
          protein_g?: number | null
          serving_size?: string | null
          storage_type?: string | null
          store?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      budget_recipes: {
        Row: {
          calories: number | null
          carbs_g: number | null
          cost_estimate: number | null
          cost_per_serving: number | null
          created_at: string
          difficulty: string | null
          fat_g: number | null
          id: string
          ingredients: string | null
          instructions: string | null
          preparation_time: string | null
          protein_g: number | null
          recipe_name: string
          servings: number | null
          updated_at: string
        }
        Insert: {
          calories?: number | null
          carbs_g?: number | null
          cost_estimate?: number | null
          cost_per_serving?: number | null
          created_at?: string
          difficulty?: string | null
          fat_g?: number | null
          id?: string
          ingredients?: string | null
          instructions?: string | null
          preparation_time?: string | null
          protein_g?: number | null
          recipe_name: string
          servings?: number | null
          updated_at?: string
        }
        Update: {
          calories?: number | null
          carbs_g?: number | null
          cost_estimate?: number | null
          cost_per_serving?: number | null
          created_at?: string
          difficulty?: string | null
          fat_g?: number | null
          id?: string
          ingredients?: string | null
          instructions?: string | null
          preparation_time?: string | null
          protein_g?: number | null
          recipe_name?: string
          servings?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      budget_staples: {
        Row: {
          calories_per_dollar: number | null
          cost_per_serving: number | null
          created_at: string
          estimated_cost_pack: number | null
          food_item: string
          id: string
          meals_it_can_be_used_in: string | null
          priority_ranking: number | null
          protein_per_dollar_g: number | null
          store: string | null
          updated_at: string
        }
        Insert: {
          calories_per_dollar?: number | null
          cost_per_serving?: number | null
          created_at?: string
          estimated_cost_pack?: number | null
          food_item: string
          id?: string
          meals_it_can_be_used_in?: string | null
          priority_ranking?: number | null
          protein_per_dollar_g?: number | null
          store?: string | null
          updated_at?: string
        }
        Update: {
          calories_per_dollar?: number | null
          cost_per_serving?: number | null
          created_at?: string
          estimated_cost_pack?: number | null
          food_item?: string
          id?: string
          meals_it_can_be_used_in?: string | null
          priority_ranking?: number | null
          protein_per_dollar_g?: number | null
          store?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      canonical_product_aliases: {
        Row: {
          alias_id: string
          alias_text: string
          alias_type: string | null
          canonical_product_id: string
          created_at: string
        }
        Insert: {
          alias_id?: string
          alias_text: string
          alias_type?: string | null
          canonical_product_id: string
          created_at?: string
        }
        Update: {
          alias_id?: string
          alias_text?: string
          alias_type?: string | null
          canonical_product_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "canonical_product_aliases_canonical_product_id_fkey"
            columns: ["canonical_product_id"]
            isOneToOne: false
            referencedRelation: "canonical_products"
            referencedColumns: ["canonical_product_id"]
          },
        ]
      }
      canonical_products: {
        Row: {
          canonical_brand: string | null
          canonical_name: string
          canonical_product_id: string
          category: string | null
          created_at: string
          default_image_url: string | null
          default_price: number | null
          default_unit: string | null
          gtin_upc: string | null
          ingredient_type: string | null
          is_generic: boolean
          normalized_size_text: string | null
          nutrition_reference_id: string | null
          nutrition_source: string | null
          size_unit: string | null
          size_value: number | null
          subcategory: string | null
          updated_at: string
        }
        Insert: {
          canonical_brand?: string | null
          canonical_name: string
          canonical_product_id?: string
          category?: string | null
          created_at?: string
          default_image_url?: string | null
          default_price?: number | null
          default_unit?: string | null
          gtin_upc?: string | null
          ingredient_type?: string | null
          is_generic?: boolean
          normalized_size_text?: string | null
          nutrition_reference_id?: string | null
          nutrition_source?: string | null
          size_unit?: string | null
          size_value?: number | null
          subcategory?: string | null
          updated_at?: string
        }
        Update: {
          canonical_brand?: string | null
          canonical_name?: string
          canonical_product_id?: string
          category?: string | null
          created_at?: string
          default_image_url?: string | null
          default_price?: number | null
          default_unit?: string | null
          gtin_upc?: string | null
          ingredient_type?: string | null
          is_generic?: boolean
          normalized_size_text?: string | null
          nutrition_reference_id?: string | null
          nutrition_source?: string | null
          size_unit?: string | null
          size_value?: number | null
          subcategory?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      channel_pricing_config: {
        Row: {
          bag_fee: number
          channel: string
          created_at: string
          delivery_fee: number
          id: string
          item_markup_pct: number
          notes: string | null
          service_fee: number
          store: string
          tax_rate: number
          tip_default_pct: number
          updated_at: string
        }
        Insert: {
          bag_fee?: number
          channel: string
          created_at?: string
          delivery_fee?: number
          id?: string
          item_markup_pct?: number
          notes?: string | null
          service_fee?: number
          store: string
          tax_rate?: number
          tip_default_pct?: number
          updated_at?: string
        }
        Update: {
          bag_fee?: number
          channel?: string
          created_at?: string
          delivery_fee?: number
          id?: string
          item_markup_pct?: number
          notes?: string | null
          service_fee?: number
          store?: string
          tax_rate?: number
          tip_default_pct?: number
          updated_at?: string
        }
        Relationships: []
      }
      cheap_meals: {
        Row: {
          calories_per_serving: number | null
          cost_per_serving: number | null
          created_at: string
          difficulty: string | null
          estimated_total_cost: number | null
          family_friendly: string | null
          id: string
          ingredients: string | null
          kid_friendly: string | null
          meal_name: string
          meal_type: string | null
          notes: string | null
          preparation_time: string | null
          protein_per_serving_g: number | null
          store_availability: string | null
          updated_at: string
        }
        Insert: {
          calories_per_serving?: number | null
          cost_per_serving?: number | null
          created_at?: string
          difficulty?: string | null
          estimated_total_cost?: number | null
          family_friendly?: string | null
          id?: string
          ingredients?: string | null
          kid_friendly?: string | null
          meal_name: string
          meal_type?: string | null
          notes?: string | null
          preparation_time?: string | null
          protein_per_serving_g?: number | null
          store_availability?: string | null
          updated_at?: string
        }
        Update: {
          calories_per_serving?: number | null
          cost_per_serving?: number | null
          created_at?: string
          difficulty?: string | null
          estimated_total_cost?: number | null
          family_friendly?: string | null
          id?: string
          ingredients?: string | null
          kid_friendly?: string | null
          meal_name?: string
          meal_type?: string | null
          notes?: string | null
          preparation_time?: string | null
          protein_per_serving_g?: number | null
          store_availability?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      community_resources: {
        Row: {
          active: boolean
          address: string | null
          category: string
          city: string | null
          county: string | null
          created_at: string
          description: string | null
          eligibility_notes: string | null
          email: string | null
          emergency_available: boolean
          hours: string | null
          id: string
          last_verified_at: string | null
          latitude: number | null
          longitude: number | null
          name: string
          phone: string | null
          source: string | null
          state: string | null
          subcategory: string | null
          updated_at: string
          website: string | null
          what_to_bring: string | null
          zip_code: string | null
        }
        Insert: {
          active?: boolean
          address?: string | null
          category: string
          city?: string | null
          county?: string | null
          created_at?: string
          description?: string | null
          eligibility_notes?: string | null
          email?: string | null
          emergency_available?: boolean
          hours?: string | null
          id?: string
          last_verified_at?: string | null
          latitude?: number | null
          longitude?: number | null
          name: string
          phone?: string | null
          source?: string | null
          state?: string | null
          subcategory?: string | null
          updated_at?: string
          website?: string | null
          what_to_bring?: string | null
          zip_code?: string | null
        }
        Update: {
          active?: boolean
          address?: string | null
          category?: string
          city?: string | null
          county?: string | null
          created_at?: string
          description?: string | null
          eligibility_notes?: string | null
          email?: string | null
          emergency_available?: boolean
          hours?: string | null
          id?: string
          last_verified_at?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          phone?: string | null
          source?: string | null
          state?: string | null
          subcategory?: string | null
          updated_at?: string
          website?: string | null
          what_to_bring?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      engagement_email_log: {
        Row: {
          email_type: string
          id: string
          period_key: string
          sent_at: string
          user_id: string
        }
        Insert: {
          email_type: string
          id?: string
          period_key: string
          sent_at?: string
          user_id: string
        }
        Update: {
          email_type?: string
          id?: string
          period_key?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: []
      }
      family_assistance_ai_recommendations: {
        Row: {
          ai_summary: string | null
          created_at: string
          id: string
          next_steps: Json
          recommended_resource_ids: Json
          request_id: string | null
          urgent_notes: string | null
          user_id: string
        }
        Insert: {
          ai_summary?: string | null
          created_at?: string
          id?: string
          next_steps?: Json
          recommended_resource_ids?: Json
          request_id?: string | null
          urgent_notes?: string | null
          user_id: string
        }
        Update: {
          ai_summary?: string | null
          created_at?: string
          id?: string
          next_steps?: Json
          recommended_resource_ids?: Json
          request_id?: string | null
          urgent_notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_assistance_ai_recommendations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "family_assistance_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      family_assistance_profiles: {
        Row: {
          children_5_to_12: number | null
          children_under_5: number | null
          created_at: string
          currently_receiving_medicaid: boolean | null
          currently_receiving_snap: boolean | null
          currently_receiving_wic: boolean | null
          employment_status: string | null
          household_size: number | null
          id: string
          lost_job_recently: boolean | null
          monthly_income_range: string | null
          reduced_hours_recently: boolean | null
          seniors_65_plus: number | null
          teenagers: number | null
          updated_at: string
          user_id: string
          zip_code: string | null
        }
        Insert: {
          children_5_to_12?: number | null
          children_under_5?: number | null
          created_at?: string
          currently_receiving_medicaid?: boolean | null
          currently_receiving_snap?: boolean | null
          currently_receiving_wic?: boolean | null
          employment_status?: string | null
          household_size?: number | null
          id?: string
          lost_job_recently?: boolean | null
          monthly_income_range?: string | null
          reduced_hours_recently?: boolean | null
          seniors_65_plus?: number | null
          teenagers?: number | null
          updated_at?: string
          user_id: string
          zip_code?: string | null
        }
        Update: {
          children_5_to_12?: number | null
          children_under_5?: number | null
          created_at?: string
          currently_receiving_medicaid?: boolean | null
          currently_receiving_snap?: boolean | null
          currently_receiving_wic?: boolean | null
          employment_status?: string | null
          household_size?: number | null
          id?: string
          lost_job_recently?: boolean | null
          monthly_income_range?: string | null
          reduced_hours_recently?: boolean | null
          seniors_65_plus?: number | null
          teenagers?: number | null
          updated_at?: string
          user_id?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      family_assistance_requests: {
        Row: {
          created_at: string
          employment_status: string | null
          has_children: boolean | null
          household_size: number | null
          id: string
          receives_benefits: string | null
          selected_categories: Json
          updated_at: string
          urgency_level: string
          user_id: string
          zip_code: string | null
        }
        Insert: {
          created_at?: string
          employment_status?: string | null
          has_children?: boolean | null
          household_size?: number | null
          id?: string
          receives_benefits?: string | null
          selected_categories?: Json
          updated_at?: string
          urgency_level?: string
          user_id: string
          zip_code?: string | null
        }
        Update: {
          created_at?: string
          employment_status?: string | null
          has_children?: boolean | null
          household_size?: number | null
          id?: string
          receives_benefits?: string | null
          selected_categories?: Json
          updated_at?: string
          urgency_level?: string
          user_id?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      food_budget_settings: {
        Row: {
          budget_month: string | null
          coffee_budget: number | null
          created_at: string
          food_delivery_budget: number | null
          grocery_budget: number | null
          id: string
          monthly_food_budget: number
          restaurant_budget: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          budget_month?: string | null
          coffee_budget?: number | null
          created_at?: string
          food_delivery_budget?: number | null
          grocery_budget?: number | null
          id?: string
          monthly_food_budget?: number
          restaurant_budget?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          budget_month?: string | null
          coffee_budget?: number | null
          created_at?: string
          food_delivery_budget?: number | null
          grocery_budget?: number | null
          id?: string
          monthly_food_budget?: number
          restaurant_budget?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      food_budget_summaries: {
        Row: {
          budget_health_score: number
          coffee_spending: number
          created_at: string
          food_delivery_spending: number
          grocery_spending: number
          id: string
          month: string
          monthly_food_budget: number | null
          other_food_spending: number
          potential_savings: number | null
          projected_month_end_spending: number | null
          remaining_budget: number
          restaurant_spending: number
          spent_total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          budget_health_score?: number
          coffee_spending?: number
          created_at?: string
          food_delivery_spending?: number
          grocery_spending?: number
          id?: string
          month: string
          monthly_food_budget?: number | null
          other_food_spending?: number
          potential_savings?: number | null
          projected_month_end_spending?: number | null
          remaining_budget?: number
          restaurant_spending?: number
          spent_total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          budget_health_score?: number
          coffee_spending?: number
          created_at?: string
          food_delivery_spending?: number
          grocery_spending?: number
          id?: string
          month?: string
          monthly_food_budget?: number | null
          other_food_spending?: number
          potential_savings?: number | null
          projected_month_end_spending?: number | null
          remaining_budget?: number
          restaurant_spending?: number
          spent_total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      food_transactions: {
        Row: {
          account_id: string | null
          amount: number
          category: string | null
          created_at: string
          date: string
          id: string
          merchant_name: string | null
          normalized_category: string
          pending: boolean
          plaid_transaction_id: string
          source: string
          transaction_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          category?: string | null
          created_at?: string
          date: string
          id?: string
          merchant_name?: string | null
          normalized_category: string
          pending?: boolean
          plaid_transaction_id: string
          source?: string
          transaction_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          category?: string | null
          created_at?: string
          date?: string
          id?: string
          merchant_name?: string | null
          normalized_category?: string
          pending?: boolean
          plaid_transaction_id?: string
          source?: string
          transaction_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      food_waste_alerts: {
        Row: {
          alert_type: string
          created_at: string
          days_until_expiration: number | null
          estimated_value: number | null
          id: string
          message: string | null
          pantry_item_id: string | null
          resolved: boolean
          user_id: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          days_until_expiration?: number | null
          estimated_value?: number | null
          id?: string
          message?: string | null
          pantry_item_id?: string | null
          resolved?: boolean
          user_id: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          days_until_expiration?: number | null
          estimated_value?: number | null
          id?: string
          message?: string | null
          pantry_item_id?: string | null
          resolved?: boolean
          user_id?: string
        }
        Relationships: []
      }
      food_waste_logs: {
        Row: {
          created_at: string
          had_waste: boolean
          id: string
          notes: string | null
          user_id: string
          week_start: string
        }
        Insert: {
          created_at?: string
          had_waste: boolean
          id?: string
          notes?: string | null
          user_id: string
          week_start: string
        }
        Update: {
          created_at?: string
          had_waste?: boolean
          id?: string
          notes?: string | null
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      generated_recipe_ingredients: {
        Row: {
          already_have: boolean
          created_at: string
          estimated_price: number | null
          id: string
          instacart_search_term: string | null
          item_name: string
          normalized_item_name: string | null
          pantry_item_id: string | null
          quantity: string | null
          recipe_id: string
          source_location: string | null
          unit: string | null
          user_id: string
        }
        Insert: {
          already_have?: boolean
          created_at?: string
          estimated_price?: number | null
          id?: string
          instacart_search_term?: string | null
          item_name: string
          normalized_item_name?: string | null
          pantry_item_id?: string | null
          quantity?: string | null
          recipe_id: string
          source_location?: string | null
          unit?: string | null
          user_id: string
        }
        Update: {
          already_have?: boolean
          created_at?: string
          estimated_price?: number | null
          id?: string
          instacart_search_term?: string | null
          item_name?: string
          normalized_item_name?: string | null
          pantry_item_id?: string | null
          quantity?: string | null
          recipe_id?: string
          source_location?: string | null
          unit?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "generated_recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_recipes: {
        Row: {
          cook_time_minutes: number | null
          cooked_at: string | null
          created_at: string
          description: string | null
          difficulty: string | null
          estimated_cost_of_missing_items: number | null
          food_waste_reason: string | null
          id: string
          instructions: Json | null
          prep_time_minutes: number | null
          recipe_name: string
          savings_estimate: number | null
          servings: number | null
          source_type: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cook_time_minutes?: number | null
          cooked_at?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string | null
          estimated_cost_of_missing_items?: number | null
          food_waste_reason?: string | null
          id?: string
          instructions?: Json | null
          prep_time_minutes?: number | null
          recipe_name: string
          savings_estimate?: number | null
          servings?: number | null
          source_type?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cook_time_minutes?: number | null
          cooked_at?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string | null
          estimated_cost_of_missing_items?: number | null
          food_waste_reason?: string | null
          id?: string
          instructions?: Json | null
          prep_time_minutes?: number | null
          recipe_name?: string
          savings_estimate?: number | null
          servings?: number | null
          source_type?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      grocery_list_items: {
        Row: {
          already_have: boolean | null
          category: string | null
          checked: boolean
          created_at: string
          estimated_price: number | null
          grocery_list_id: string | null
          id: string
          ingredient_name: string
          instacart_search_term: string | null
          is_checked: boolean | null
          meal_plan_id: string | null
          needed_for_meals: string[] | null
          normalized_item_name: string | null
          quantity: string
          recipe_id: string | null
          selected_for_instacart: boolean
          source_ref_id: string | null
          source_type: string
          store_section: string | null
          unit: string | null
          user_id: string
        }
        Insert: {
          already_have?: boolean | null
          category?: string | null
          checked?: boolean
          created_at?: string
          estimated_price?: number | null
          grocery_list_id?: string | null
          id?: string
          ingredient_name: string
          instacart_search_term?: string | null
          is_checked?: boolean | null
          meal_plan_id?: string | null
          needed_for_meals?: string[] | null
          normalized_item_name?: string | null
          quantity: string
          recipe_id?: string | null
          selected_for_instacart?: boolean
          source_ref_id?: string | null
          source_type?: string
          store_section?: string | null
          unit?: string | null
          user_id: string
        }
        Update: {
          already_have?: boolean | null
          category?: string | null
          checked?: boolean
          created_at?: string
          estimated_price?: number | null
          grocery_list_id?: string | null
          id?: string
          ingredient_name?: string
          instacart_search_term?: string | null
          is_checked?: boolean | null
          meal_plan_id?: string | null
          needed_for_meals?: string[] | null
          normalized_item_name?: string | null
          quantity?: string
          recipe_id?: string | null
          selected_for_instacart?: boolean
          source_ref_id?: string | null
          source_type?: string
          store_section?: string | null
          unit?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grocery_list_items_grocery_list_id_fkey"
            columns: ["grocery_list_id"]
            isOneToOne: false
            referencedRelation: "grocery_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      grocery_lists: {
        Row: {
          created_at: string
          estimated_total: number | null
          id: string
          meal_plan_id: string | null
          status: string | null
          store_name: string | null
          tax_rate: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          estimated_total?: number | null
          id?: string
          meal_plan_id?: string | null
          status?: string | null
          store_name?: string | null
          tax_rate?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          estimated_total?: number | null
          id?: string
          meal_plan_id?: string | null
          status?: string | null
          store_name?: string | null
          tax_rate?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grocery_lists_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      grocery_price_reference: {
        Row: {
          avg_price: number | null
          category: string | null
          created_at: string
          display_name: string | null
          high_price: number | null
          id: string
          ingredient_key: string
          low_price: number | null
          notes: string | null
          source: string | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          avg_price?: number | null
          category?: string | null
          created_at?: string
          display_name?: string | null
          high_price?: number | null
          id?: string
          ingredient_key: string
          low_price?: number | null
          notes?: string | null
          source?: string | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          avg_price?: number | null
          category?: string | null
          created_at?: string
          display_name?: string | null
          high_price?: number | null
          id?: string
          ingredient_key?: string
          low_price?: number | null
          notes?: string | null
          source?: string | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      household_store_preferences: {
        Row: {
          address_line_1: string | null
          city: string | null
          created_at: string
          household_id: string
          household_store_preference_id: string
          latitude: number | null
          longitude: number | null
          preferred_retailer_id: string | null
          preferred_store_id: string | null
          primary_store_flag: boolean
          state: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address_line_1?: string | null
          city?: string | null
          created_at?: string
          household_id: string
          household_store_preference_id?: string
          latitude?: number | null
          longitude?: number | null
          preferred_retailer_id?: string | null
          preferred_store_id?: string | null
          primary_store_flag?: boolean
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address_line_1?: string | null
          city?: string | null
          created_at?: string
          household_id?: string
          household_store_preference_id?: string
          latitude?: number | null
          longitude?: number | null
          preferred_retailer_id?: string | null
          preferred_store_id?: string | null
          primary_store_flag?: boolean
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      ingredients: {
        Row: {
          calories: number | null
          carbs_g: number | null
          category: string | null
          created_at: string
          fat_g: number | null
          fiber_g: number | null
          ingredient_id: string
          ingredient_name: string
          protein_g: number | null
          serving_size: string | null
          serving_size_grams: number | null
          updated_at: string
          usda_description: string | null
          usda_food_id: string | null
        }
        Insert: {
          calories?: number | null
          carbs_g?: number | null
          category?: string | null
          created_at?: string
          fat_g?: number | null
          fiber_g?: number | null
          ingredient_id?: string
          ingredient_name: string
          protein_g?: number | null
          serving_size?: string | null
          serving_size_grams?: number | null
          updated_at?: string
          usda_description?: string | null
          usda_food_id?: string | null
        }
        Update: {
          calories?: number | null
          carbs_g?: number | null
          category?: string | null
          created_at?: string
          fat_g?: number | null
          fiber_g?: number | null
          ingredient_id?: string
          ingredient_name?: string
          protein_g?: number | null
          serving_size?: string | null
          serving_size_grams?: number | null
          updated_at?: string
          usda_description?: string | null
          usda_food_id?: string | null
        }
        Relationships: []
      }
      instacart_access_tokens: {
        Row: {
          access_token: string
          created_at: string
          environment: string
          expires_at: string
          id: string
          scope: string | null
          token_type: string
          updated_at: string
        }
        Insert: {
          access_token: string
          created_at?: string
          environment: string
          expires_at: string
          id?: string
          scope?: string | null
          token_type?: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          created_at?: string
          environment?: string
          expires_at?: string
          id?: string
          scope?: string | null
          token_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      instacart_home_store: {
        Row: {
          created_at: string
          id: string
          postal_code: string | null
          retailer_key: string
          retailer_logo_url: string | null
          retailer_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          postal_code?: string | null
          retailer_key: string
          retailer_logo_url?: string | null
          retailer_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          postal_code?: string | null
          retailer_key?: string
          retailer_logo_url?: string | null
          retailer_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      inventory_photos: {
        Row: {
          ai_processed: boolean
          created_at: string
          detected_items_json: Json | null
          id: string
          image_url: string
          location: string | null
          scan_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_processed?: boolean
          created_at?: string
          detected_items_json?: Json | null
          id?: string
          image_url: string
          location?: string | null
          scan_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_processed?: boolean
          created_at?: string
          detected_items_json?: Json | null
          id?: string
          image_url?: string
          location?: string | null
          scan_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      kroger_access_tokens: {
        Row: {
          access_token: string
          created_at: string
          environment: string
          expires_at: string
          id: string
          scope: string | null
          token_type: string | null
          updated_at: string
        }
        Insert: {
          access_token: string
          created_at?: string
          environment: string
          expires_at: string
          id?: string
          scope?: string | null
          token_type?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          created_at?: string
          environment?: string
          expires_at?: string
          id?: string
          scope?: string | null
          token_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      kroger_locations: {
        Row: {
          address: string | null
          cached_at: string
          city: string | null
          created_at: string
          hours: Json | null
          id: string
          latitude: number | null
          location_id: string
          longitude: number | null
          name: string
          phone: string | null
          raw: Json | null
          state: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          cached_at?: string
          city?: string | null
          created_at?: string
          hours?: Json | null
          id?: string
          latitude?: number | null
          location_id: string
          longitude?: number | null
          name: string
          phone?: string | null
          raw?: Json | null
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          cached_at?: string
          city?: string | null
          created_at?: string
          hours?: Json | null
          id?: string
          latitude?: number | null
          location_id?: string
          longitude?: number | null
          name?: string
          phone?: string | null
          raw?: Json | null
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      kroger_oauth_states: {
        Row: {
          created_at: string
          expires_at: string
          redirect_after: string | null
          state: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          redirect_after?: string | null
          state: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          redirect_after?: string | null
          state?: string
          user_id?: string
        }
        Relationships: []
      }
      kroger_pricing_cache: {
        Row: {
          currency: string
          fetched_at: string
          id: string
          location_id: string
          product_id: string
          promo_price: number | null
          regular_price: number | null
          size: string | null
          stock_level: string | null
        }
        Insert: {
          currency?: string
          fetched_at?: string
          id?: string
          location_id: string
          product_id: string
          promo_price?: number | null
          regular_price?: number | null
          size?: string | null
          stock_level?: string | null
        }
        Update: {
          currency?: string
          fetched_at?: string
          id?: string
          location_id?: string
          product_id?: string
          promo_price?: number | null
          regular_price?: number | null
          size?: string | null
          stock_level?: string | null
        }
        Relationships: []
      }
      kroger_product_matches: {
        Row: {
          brand: string | null
          confidence: number | null
          created_at: string
          from_cache: boolean
          grocery_list_item_id: string | null
          id: string
          image_url: string | null
          ingredient_name: string
          location_id: string | null
          matched_at: string
          matched_name: string | null
          product_id: string | null
          size: string | null
          status: string
          unit_price: number | null
          upc: string | null
          user_id: string
        }
        Insert: {
          brand?: string | null
          confidence?: number | null
          created_at?: string
          from_cache?: boolean
          grocery_list_item_id?: string | null
          id?: string
          image_url?: string | null
          ingredient_name: string
          location_id?: string | null
          matched_at?: string
          matched_name?: string | null
          product_id?: string | null
          size?: string | null
          status?: string
          unit_price?: number | null
          upc?: string | null
          user_id: string
        }
        Update: {
          brand?: string | null
          confidence?: number | null
          created_at?: string
          from_cache?: boolean
          grocery_list_item_id?: string | null
          id?: string
          image_url?: string | null
          ingredient_name?: string
          location_id?: string | null
          matched_at?: string
          matched_name?: string | null
          product_id?: string | null
          size?: string | null
          status?: string
          unit_price?: number | null
          upc?: string | null
          user_id?: string
        }
        Relationships: []
      }
      kroger_products: {
        Row: {
          brand: string | null
          category: string | null
          created_at: string
          id: string
          image_url: string | null
          last_seen_at: string
          name: string
          product_id: string
          raw: Json | null
          size: string | null
          upc: string | null
          updated_at: string
        }
        Insert: {
          brand?: string | null
          category?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          last_seen_at?: string
          name: string
          product_id: string
          raw?: Json | null
          size?: string | null
          upc?: string | null
          updated_at?: string
        }
        Update: {
          brand?: string | null
          category?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          last_seen_at?: string
          name?: string
          product_id?: string
          raw?: Json | null
          size?: string | null
          upc?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      kroger_user_tokens: {
        Row: {
          access_token: string
          connected_at: string
          environment: string
          expires_at: string
          id: string
          refresh_token: string | null
          scope: string | null
          token_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          connected_at?: string
          environment?: string
          expires_at: string
          id?: string
          refresh_token?: string | null
          scope?: string | null
          token_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          connected_at?: string
          environment?: string
          expires_at?: string
          id?: string
          refresh_token?: string | null
          scope?: string | null
          token_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      local_resources: {
        Row: {
          address: string | null
          application_url: string | null
          category: string
          city: string | null
          created_at: string
          description: string | null
          documents_needed: string[] | null
          eligibility_notes: string | null
          hours: string | null
          id: string
          phone: string | null
          resource_name: string
          state: string | null
          updated_at: string
          verified: boolean
          website_url: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          application_url?: string | null
          category: string
          city?: string | null
          created_at?: string
          description?: string | null
          documents_needed?: string[] | null
          eligibility_notes?: string | null
          hours?: string | null
          id?: string
          phone?: string | null
          resource_name: string
          state?: string | null
          updated_at?: string
          verified?: boolean
          website_url?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          application_url?: string | null
          category?: string
          city?: string | null
          created_at?: string
          description?: string | null
          documents_needed?: string[] | null
          eligibility_notes?: string | null
          hours?: string | null
          id?: string
          phone?: string | null
          resource_name?: string
          state?: string | null
          updated_at?: string
          verified?: boolean
          website_url?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      marketing_campaigns: {
        Row: {
          caption: string | null
          created_at: string
          created_by: string | null
          id: string
          image_url: string | null
          notes: string | null
          platform: string | null
          publish_date: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          notes?: string | null
          platform?: string | null
          publish_date?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          notes?: string | null
          platform?: string | null
          publish_date?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      meal_ingredients: {
        Row: {
          already_have: boolean
          created_at: string
          estimated_price: number | null
          id: string
          instacart_search_term: string | null
          item_name: string
          meal_id: string
          pantry_item_id: string | null
          quantity: string | null
          source: string | null
          source_location: string | null
          unit: string | null
          user_id: string
        }
        Insert: {
          already_have?: boolean
          created_at?: string
          estimated_price?: number | null
          id?: string
          instacart_search_term?: string | null
          item_name: string
          meal_id: string
          pantry_item_id?: string | null
          quantity?: string | null
          source?: string | null
          source_location?: string | null
          unit?: string | null
          user_id: string
        }
        Update: {
          already_have?: boolean
          created_at?: string
          estimated_price?: number | null
          id?: string
          instacart_search_term?: string | null
          item_name?: string
          meal_id?: string
          pantry_item_id?: string | null
          quantity?: string | null
          source?: string | null
          source_location?: string | null
          unit?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_ingredients_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "meal_plan_meals"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plan_ai_insights: {
        Row: {
          created_at: string
          estimated_savings: number | null
          id: string
          insight_type: string
          meal_plan_id: string
          message: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          estimated_savings?: number | null
          id?: string
          insight_type: string
          meal_plan_id: string
          message?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          estimated_savings?: number | null
          id?: string
          insight_type?: string
          meal_plan_id?: string
          message?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      meal_plan_cost_breakdown: {
        Row: {
          bag_fee: number
          budget: number | null
          budget_exceeded: boolean
          channel: string
          created_at: string
          delivered_total: number
          delivery_fee: number
          id: string
          in_store_subtotal: number
          item_markup: number
          line_items: Json
          meal_plan_id: string
          pantry_savings: number
          remaining: number | null
          service_fee: number
          store: string | null
          tax: number
          tip: number
          updated_at: string
          user_id: string
          warning_text: string | null
          zip_code: string | null
        }
        Insert: {
          bag_fee?: number
          budget?: number | null
          budget_exceeded?: boolean
          channel?: string
          created_at?: string
          delivered_total?: number
          delivery_fee?: number
          id?: string
          in_store_subtotal?: number
          item_markup?: number
          line_items?: Json
          meal_plan_id: string
          pantry_savings?: number
          remaining?: number | null
          service_fee?: number
          store?: string | null
          tax?: number
          tip?: number
          updated_at?: string
          user_id: string
          warning_text?: string | null
          zip_code?: string | null
        }
        Update: {
          bag_fee?: number
          budget?: number | null
          budget_exceeded?: boolean
          channel?: string
          created_at?: string
          delivered_total?: number
          delivery_fee?: number
          id?: string
          in_store_subtotal?: number
          item_markup?: number
          line_items?: Json
          meal_plan_id?: string
          pantry_savings?: number
          remaining?: number | null
          service_fee?: number
          store?: string | null
          tax?: number
          tip?: number
          updated_at?: string
          user_id?: string
          warning_text?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_cost_breakdown_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: true
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plan_days: {
        Row: {
          created_at: string
          date: string | null
          day_name: string
          id: string
          meal_plan_id: string
          sort_order: number
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string | null
          day_name: string
          id?: string
          meal_plan_id: string
          sort_order?: number
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string | null
          day_name?: string
          id?: string
          meal_plan_id?: string
          sort_order?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_days_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plan_generation_jobs: {
        Row: {
          completed_at: string | null
          completed_steps: string[]
          created_at: string
          current_stage: string
          current_step: string | null
          error_code: string | null
          error_message: string | null
          fallback_used: boolean
          id: string
          last_heartbeat_at: string
          meal_plan_id: string | null
          metadata: Json
          started_at: string
          status: string
          status_message: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_steps?: string[]
          created_at?: string
          current_stage?: string
          current_step?: string | null
          error_code?: string | null
          error_message?: string | null
          fallback_used?: boolean
          id?: string
          last_heartbeat_at?: string
          meal_plan_id?: string | null
          metadata?: Json
          started_at?: string
          status?: string
          status_message?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          completed_steps?: string[]
          created_at?: string
          current_stage?: string
          current_step?: string | null
          error_code?: string | null
          error_message?: string | null
          fallback_used?: boolean
          id?: string
          last_heartbeat_at?: string
          meal_plan_id?: string | null
          metadata?: Json
          started_at?: string
          status?: string
          status_message?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      meal_plan_meals: {
        Row: {
          calories_estimate: number | null
          carbs_estimate: number | null
          cook_time_minutes: number | null
          cooked_at: string | null
          created_at: string
          day_id: string | null
          description: string | null
          difficulty: string | null
          estimated_cost: number | null
          estimated_cost_per_serving: number | null
          fats_estimate: number | null
          favorited: boolean
          fiber_estimate: number | null
          food_waste_reason: string | null
          id: string
          image_url: string | null
          instructions: Json | null
          marked_cooked: boolean
          meal_name: string
          meal_plan_id: string
          meal_type: string
          prep_time_minutes: number | null
          protein_estimate: number | null
          recipe_id: string | null
          sodium_estimate: number | null
          user_id: string
        }
        Insert: {
          calories_estimate?: number | null
          carbs_estimate?: number | null
          cook_time_minutes?: number | null
          cooked_at?: string | null
          created_at?: string
          day_id?: string | null
          description?: string | null
          difficulty?: string | null
          estimated_cost?: number | null
          estimated_cost_per_serving?: number | null
          fats_estimate?: number | null
          favorited?: boolean
          fiber_estimate?: number | null
          food_waste_reason?: string | null
          id?: string
          image_url?: string | null
          instructions?: Json | null
          marked_cooked?: boolean
          meal_name: string
          meal_plan_id: string
          meal_type: string
          prep_time_minutes?: number | null
          protein_estimate?: number | null
          recipe_id?: string | null
          sodium_estimate?: number | null
          user_id: string
        }
        Update: {
          calories_estimate?: number | null
          carbs_estimate?: number | null
          cook_time_minutes?: number | null
          cooked_at?: string | null
          created_at?: string
          day_id?: string | null
          description?: string | null
          difficulty?: string | null
          estimated_cost?: number | null
          estimated_cost_per_serving?: number | null
          fats_estimate?: number | null
          favorited?: boolean
          fiber_estimate?: number | null
          food_waste_reason?: string | null
          id?: string
          image_url?: string | null
          instructions?: Json | null
          marked_cooked?: boolean
          meal_name?: string
          meal_plan_id?: string
          meal_type?: string
          prep_time_minutes?: number | null
          protein_estimate?: number | null
          recipe_id?: string | null
          sodium_estimate?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_meals_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "meal_plan_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plan_meals_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plan_weekly_totals: {
        Row: {
          avg_calories_per_person_per_day: number | null
          calories_per_week: number | null
          created_at: string
          id: string
          plan_tier: string
          protein_g_per_week: number | null
          supports_people: number
          updated_at: string
          weekly_budget: number
          weekly_cost: number | null
        }
        Insert: {
          avg_calories_per_person_per_day?: number | null
          calories_per_week?: number | null
          created_at?: string
          id?: string
          plan_tier: string
          protein_g_per_week?: number | null
          supports_people: number
          updated_at?: string
          weekly_budget: number
          weekly_cost?: number | null
        }
        Update: {
          avg_calories_per_person_per_day?: number | null
          calories_per_week?: number | null
          created_at?: string
          id?: string
          plan_tier?: string
          protein_g_per_week?: number | null
          supports_people?: number
          updated_at?: string
          weekly_budget?: number
          weekly_cost?: number | null
        }
        Relationships: []
      }
      meal_plans: {
        Row: {
          budget_status: string | null
          created_at: string
          estimated_cost_per_serving: number | null
          estimated_daily_average: number | null
          food_waste_prevented_count: number
          grocery_purchase_date: string | null
          grocery_status: string
          id: string
          instacart_order_id: string | null
          meals_completed: number
          plan_data: Json | null
          savings_estimate: number | null
          status: string | null
          total_estimated_cost: number | null
          total_meals: number | null
          updated_at: string
          user_id: string
          week_start: string
          week_start_date: string | null
          weekly_savings: number | null
          why_this_plan: Json | null
        }
        Insert: {
          budget_status?: string | null
          created_at?: string
          estimated_cost_per_serving?: number | null
          estimated_daily_average?: number | null
          food_waste_prevented_count?: number
          grocery_purchase_date?: string | null
          grocery_status?: string
          id?: string
          instacart_order_id?: string | null
          meals_completed?: number
          plan_data?: Json | null
          savings_estimate?: number | null
          status?: string | null
          total_estimated_cost?: number | null
          total_meals?: number | null
          updated_at?: string
          user_id: string
          week_start: string
          week_start_date?: string | null
          weekly_savings?: number | null
          why_this_plan?: Json | null
        }
        Update: {
          budget_status?: string | null
          created_at?: string
          estimated_cost_per_serving?: number | null
          estimated_daily_average?: number | null
          food_waste_prevented_count?: number
          grocery_purchase_date?: string | null
          grocery_status?: string
          id?: string
          instacart_order_id?: string | null
          meals_completed?: number
          plan_data?: Json | null
          savings_estimate?: number | null
          status?: string | null
          total_estimated_cost?: number | null
          total_meals?: number | null
          updated_at?: string
          user_id?: string
          week_start?: string
          week_start_date?: string | null
          weekly_savings?: number | null
          why_this_plan?: Json | null
        }
        Relationships: []
      }
      missing_ingredient_log: {
        Row: {
          first_seen_at: string
          id: string
          ingredient_name: string
          last_seen_at: string
          last_state_code: string | null
          last_store_code: string | null
          last_user_id: string | null
          normalized_name: string
          occurrence_count: number
        }
        Insert: {
          first_seen_at?: string
          id?: string
          ingredient_name: string
          last_seen_at?: string
          last_state_code?: string | null
          last_store_code?: string | null
          last_user_id?: string | null
          normalized_name: string
          occurrence_count?: number
        }
        Update: {
          first_seen_at?: string
          id?: string
          ingredient_name?: string
          last_seen_at?: string
          last_state_code?: string | null
          last_store_code?: string | null
          last_user_id?: string | null
          normalized_name?: string
          occurrence_count?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          metadata: Json | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          metadata?: Json | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          metadata?: Json | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      open_food_facts_cache: {
        Row: {
          brand: string | null
          cached_at: string
          calories: number | null
          carbs: number | null
          fat: number | null
          id: string
          image: string | null
          item_name: string
          product_name: string | null
          protein: number | null
        }
        Insert: {
          brand?: string | null
          cached_at?: string
          calories?: number | null
          carbs?: number | null
          fat?: number | null
          id?: string
          image?: string | null
          item_name: string
          product_name?: string | null
          protein?: number | null
        }
        Update: {
          brand?: string | null
          cached_at?: string
          calories?: number | null
          carbs?: number | null
          fat?: number | null
          id?: string
          image?: string | null
          item_name?: string
          product_name?: string | null
          protein?: number | null
        }
        Relationships: []
      }
      package_prices: {
        Row: {
          as_of_date: string
          brand: string | null
          category: string | null
          created_at: string
          display_name: string
          id: string
          item_key: string
          package_price: number
          package_size: number
          package_unit: string
          servings_per_package: number | null
          source: string | null
          store: string
          unit_price: number | null
          updated_at: string
          zip_prefix: string | null
        }
        Insert: {
          as_of_date?: string
          brand?: string | null
          category?: string | null
          created_at?: string
          display_name: string
          id?: string
          item_key: string
          package_price: number
          package_size: number
          package_unit: string
          servings_per_package?: number | null
          source?: string | null
          store: string
          unit_price?: number | null
          updated_at?: string
          zip_prefix?: string | null
        }
        Update: {
          as_of_date?: string
          brand?: string | null
          category?: string | null
          created_at?: string
          display_name?: string
          id?: string
          item_key?: string
          package_price?: number
          package_size?: number
          package_unit?: string
          servings_per_package?: number | null
          source?: string | null
          store?: string
          unit_price?: number | null
          updated_at?: string
          zip_prefix?: string | null
        }
        Relationships: []
      }
      pantry_items: {
        Row: {
          category: string | null
          checked_off: boolean
          created_at: string
          estimated_value: number | null
          expiration_date: string | null
          freshness_status: string | null
          id: string
          is_low_stock: boolean | null
          is_out_of_stock: boolean | null
          item_name: string
          location: string | null
          manually_added: boolean
          normalized_item_name: string | null
          photo_detected: boolean
          purchase_date: string | null
          quantity: string | null
          receipt_detected: boolean
          unit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          checked_off?: boolean
          created_at?: string
          estimated_value?: number | null
          expiration_date?: string | null
          freshness_status?: string | null
          id?: string
          is_low_stock?: boolean | null
          is_out_of_stock?: boolean | null
          item_name: string
          location?: string | null
          manually_added?: boolean
          normalized_item_name?: string | null
          photo_detected?: boolean
          purchase_date?: string | null
          quantity?: string | null
          receipt_detected?: boolean
          unit?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          checked_off?: boolean
          created_at?: string
          estimated_value?: number | null
          expiration_date?: string | null
          freshness_status?: string | null
          id?: string
          is_low_stock?: boolean | null
          is_out_of_stock?: boolean | null
          item_name?: string
          location?: string | null
          manually_added?: boolean
          normalized_item_name?: string | null
          photo_detected?: boolean
          purchase_date?: string | null
          quantity?: string | null
          receipt_detected?: boolean
          unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      partnership_requests: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          organization: string
          request_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          website: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          organization: string
          request_type: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          organization?: string
          request_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          website?: string | null
        }
        Relationships: []
      }
      plaid_accounts: {
        Row: {
          account_id: string
          account_name: string | null
          account_subtype: string | null
          account_type: string | null
          connected: boolean
          created_at: string
          id: string
          mask: string | null
          plaid_connection_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          account_name?: string | null
          account_subtype?: string | null
          account_type?: string | null
          connected?: boolean
          created_at?: string
          id?: string
          mask?: string | null
          plaid_connection_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          account_name?: string | null
          account_subtype?: string | null
          account_type?: string | null
          connected?: boolean
          created_at?: string
          id?: string
          mask?: string | null
          plaid_connection_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plaid_accounts_plaid_connection_id_fkey"
            columns: ["plaid_connection_id"]
            isOneToOne: false
            referencedRelation: "plaid_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      plaid_connections: {
        Row: {
          access_token_encrypted: string
          created_at: string
          id: string
          institution_id: string | null
          institution_name: string | null
          item_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token_encrypted: string
          created_at?: string
          id?: string
          institution_id?: string | null
          institution_name?: string | null
          item_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token_encrypted?: string
          created_at?: string
          id?: string
          institution_id?: string | null
          institution_name?: string | null
          item_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      plaid_link_sessions: {
        Row: {
          created_at: string
          link_token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          link_token: string
          user_id: string
        }
        Update: {
          created_at?: string
          link_token?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_status: string | null
          allergies: string[] | null
          analytics_opt_in: boolean
          assistance_childcare: boolean | null
          assistance_diapers: boolean | null
          assistance_employment: boolean | null
          assistance_food: boolean | null
          assistance_healthcare: boolean | null
          assistance_housing: boolean | null
          assistance_snap: boolean | null
          assistance_transportation: boolean | null
          assistance_utilities: boolean | null
          assistance_wic: boolean | null
          beta_user: boolean
          children_5_to_12: number | null
          children_ages: string[] | null
          children_under_5: number | null
          city: string | null
          cooking_confidence: string | null
          cooking_style: string | null
          cooking_time_preference: string | null
          created_at: string
          data_usage_opt_in: boolean
          dietary_preferences: string[] | null
          disliked_foods: string[]
          display_name: string | null
          eligibility_category: string | null
          email: string | null
          food_assistance_status: string | null
          food_preferences: string[] | null
          food_waste_alerts_enabled: boolean | null
          food_waste_recipe_suggestions_enabled: boolean | null
          goal_build_muscle: boolean | null
          goal_improve_mobility: boolean | null
          goal_lose_weight: boolean | null
          goal_stay_active: boolean | null
          home_store: string | null
          household_size: number | null
          id: string
          infant_formula: boolean | null
          kitchen_equipment: string[] | null
          kroger_location_id: string | null
          kroger_store_name: string | null
          kroger_store_zip: string | null
          last_active: string | null
          last_engagement_email_at: string | null
          latitude: number | null
          longitude: number | null
          meal_repetition: string | null
          membership_discount: number | null
          membership_tier: string | null
          monthly_snap_amount: number | null
          notification_preferences: Json
          onboarding_completed_at: string | null
          phone_number: string | null
          plaid_interest: string | null
          preferred_store_id: string | null
          preferred_stores: string[] | null
          questionnaire_completed: boolean | null
          questionnaire_progress: Json | null
          referral_source: string | null
          seniors_65_plus: number | null
          show_snap_tracker: boolean
          snap_deposit_day: number | null
          snap_status: boolean | null
          state: string | null
          teenagers: number | null
          tier: string
          updated_at: string
          user_goals: string[] | null
          user_id: string
          user_type: string | null
          weekly_budget: number | null
          zip_code: string | null
        }
        Insert: {
          account_status?: string | null
          allergies?: string[] | null
          analytics_opt_in?: boolean
          assistance_childcare?: boolean | null
          assistance_diapers?: boolean | null
          assistance_employment?: boolean | null
          assistance_food?: boolean | null
          assistance_healthcare?: boolean | null
          assistance_housing?: boolean | null
          assistance_snap?: boolean | null
          assistance_transportation?: boolean | null
          assistance_utilities?: boolean | null
          assistance_wic?: boolean | null
          beta_user?: boolean
          children_5_to_12?: number | null
          children_ages?: string[] | null
          children_under_5?: number | null
          city?: string | null
          cooking_confidence?: string | null
          cooking_style?: string | null
          cooking_time_preference?: string | null
          created_at?: string
          data_usage_opt_in?: boolean
          dietary_preferences?: string[] | null
          disliked_foods?: string[]
          display_name?: string | null
          eligibility_category?: string | null
          email?: string | null
          food_assistance_status?: string | null
          food_preferences?: string[] | null
          food_waste_alerts_enabled?: boolean | null
          food_waste_recipe_suggestions_enabled?: boolean | null
          goal_build_muscle?: boolean | null
          goal_improve_mobility?: boolean | null
          goal_lose_weight?: boolean | null
          goal_stay_active?: boolean | null
          home_store?: string | null
          household_size?: number | null
          id?: string
          infant_formula?: boolean | null
          kitchen_equipment?: string[] | null
          kroger_location_id?: string | null
          kroger_store_name?: string | null
          kroger_store_zip?: string | null
          last_active?: string | null
          last_engagement_email_at?: string | null
          latitude?: number | null
          longitude?: number | null
          meal_repetition?: string | null
          membership_discount?: number | null
          membership_tier?: string | null
          monthly_snap_amount?: number | null
          notification_preferences?: Json
          onboarding_completed_at?: string | null
          phone_number?: string | null
          plaid_interest?: string | null
          preferred_store_id?: string | null
          preferred_stores?: string[] | null
          questionnaire_completed?: boolean | null
          questionnaire_progress?: Json | null
          referral_source?: string | null
          seniors_65_plus?: number | null
          show_snap_tracker?: boolean
          snap_deposit_day?: number | null
          snap_status?: boolean | null
          state?: string | null
          teenagers?: number | null
          tier?: string
          updated_at?: string
          user_goals?: string[] | null
          user_id: string
          user_type?: string | null
          weekly_budget?: number | null
          zip_code?: string | null
        }
        Update: {
          account_status?: string | null
          allergies?: string[] | null
          analytics_opt_in?: boolean
          assistance_childcare?: boolean | null
          assistance_diapers?: boolean | null
          assistance_employment?: boolean | null
          assistance_food?: boolean | null
          assistance_healthcare?: boolean | null
          assistance_housing?: boolean | null
          assistance_snap?: boolean | null
          assistance_transportation?: boolean | null
          assistance_utilities?: boolean | null
          assistance_wic?: boolean | null
          beta_user?: boolean
          children_5_to_12?: number | null
          children_ages?: string[] | null
          children_under_5?: number | null
          city?: string | null
          cooking_confidence?: string | null
          cooking_style?: string | null
          cooking_time_preference?: string | null
          created_at?: string
          data_usage_opt_in?: boolean
          dietary_preferences?: string[] | null
          disliked_foods?: string[]
          display_name?: string | null
          eligibility_category?: string | null
          email?: string | null
          food_assistance_status?: string | null
          food_preferences?: string[] | null
          food_waste_alerts_enabled?: boolean | null
          food_waste_recipe_suggestions_enabled?: boolean | null
          goal_build_muscle?: boolean | null
          goal_improve_mobility?: boolean | null
          goal_lose_weight?: boolean | null
          goal_stay_active?: boolean | null
          home_store?: string | null
          household_size?: number | null
          id?: string
          infant_formula?: boolean | null
          kitchen_equipment?: string[] | null
          kroger_location_id?: string | null
          kroger_store_name?: string | null
          kroger_store_zip?: string | null
          last_active?: string | null
          last_engagement_email_at?: string | null
          latitude?: number | null
          longitude?: number | null
          meal_repetition?: string | null
          membership_discount?: number | null
          membership_tier?: string | null
          monthly_snap_amount?: number | null
          notification_preferences?: Json
          onboarding_completed_at?: string | null
          phone_number?: string | null
          plaid_interest?: string | null
          preferred_store_id?: string | null
          preferred_stores?: string[] | null
          questionnaire_completed?: boolean | null
          questionnaire_progress?: Json | null
          referral_source?: string | null
          seniors_65_plus?: number | null
          show_snap_tracker?: boolean
          snap_deposit_day?: number | null
          snap_status?: boolean | null
          state?: string | null
          teenagers?: number | null
          tier?: string
          updated_at?: string
          user_goals?: string[] | null
          user_id?: string
          user_type?: string | null
          weekly_budget?: number | null
          zip_code?: string | null
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string
          device_info: Json | null
          id: string
          last_active_at: string
          platform: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_info?: Json | null
          id?: string
          last_active_at?: string
          platform: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_info?: Json | null
          id?: string
          last_active_at?: string
          platform?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      recipe_ingredients: {
        Row: {
          created_at: string
          display_text: string | null
          id: string
          ingredient_id: string
          quantity: number | null
          recipe_id: string
          sort_order: number
          unit: string | null
        }
        Insert: {
          created_at?: string
          display_text?: string | null
          id?: string
          ingredient_id: string
          quantity?: number | null
          recipe_id: string
          sort_order?: number
          unit?: string | null
        }
        Update: {
          created_at?: string
          display_text?: string | null
          id?: string
          ingredient_id?: string
          quantity?: number | null
          recipe_id?: string
          sort_order?: number
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["ingredient_id"]
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_usage: {
        Row: {
          cooked_at: string | null
          created_at: string
          favorited: boolean
          id: string
          meal_plan_id: string | null
          meal_type: string | null
          recipe_id: string
          updated_at: string
          user_id: string
          week_start: string
        }
        Insert: {
          cooked_at?: string | null
          created_at?: string
          favorited?: boolean
          id?: string
          meal_plan_id?: string | null
          meal_type?: string | null
          recipe_id: string
          updated_at?: string
          user_id: string
          week_start: string
        }
        Update: {
          cooked_at?: string | null
          created_at?: string
          favorited?: boolean
          id?: string
          meal_plan_id?: string | null
          meal_type?: string | null
          recipe_id?: string
          updated_at?: string
          user_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_usage_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          avg_rating: number | null
          budget_tier: string | null
          calories: number | null
          carbs_g: number | null
          category: string | null
          cook_time_minutes: number | null
          cost_estimate: number | null
          cost_per_serving: number | null
          created_at: string
          created_by_user_id: string | null
          description: string | null
          estimated_recipe_cost: number | null
          fats_g: number | null
          fiber_g: number | null
          id: string
          image_url: string | null
          ingredients: Json
          instructions: Json
          is_active: boolean
          is_public: boolean | null
          kid_friendly: boolean | null
          meal_type: string | null
          prep_time_minutes: number | null
          protein_g: number | null
          serving_size: number | null
          sodium_mg: number | null
          source: string
          tags: string[]
          times_used: number
          title: string
        }
        Insert: {
          avg_rating?: number | null
          budget_tier?: string | null
          calories?: number | null
          carbs_g?: number | null
          category?: string | null
          cook_time_minutes?: number | null
          cost_estimate?: number | null
          cost_per_serving?: number | null
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          estimated_recipe_cost?: number | null
          fats_g?: number | null
          fiber_g?: number | null
          id?: string
          image_url?: string | null
          ingredients?: Json
          instructions?: Json
          is_active?: boolean
          is_public?: boolean | null
          kid_friendly?: boolean | null
          meal_type?: string | null
          prep_time_minutes?: number | null
          protein_g?: number | null
          serving_size?: number | null
          sodium_mg?: number | null
          source?: string
          tags?: string[]
          times_used?: number
          title: string
        }
        Update: {
          avg_rating?: number | null
          budget_tier?: string | null
          calories?: number | null
          carbs_g?: number | null
          category?: string | null
          cook_time_minutes?: number | null
          cost_estimate?: number | null
          cost_per_serving?: number | null
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          estimated_recipe_cost?: number | null
          fats_g?: number | null
          fiber_g?: number | null
          id?: string
          image_url?: string | null
          ingredients?: Json
          instructions?: Json
          is_active?: boolean
          is_public?: boolean | null
          kid_friendly?: boolean | null
          meal_type?: string | null
          prep_time_minutes?: number | null
          protein_g?: number | null
          serving_size?: number | null
          sodium_mg?: number | null
          source?: string
          tags?: string[]
          times_used?: number
          title?: string
        }
        Relationships: []
      }
      resource_categories: {
        Row: {
          created_at: string
          description: string
          icon: string
          id: string
          slug: string
          sort_order: number
          title: string
        }
        Insert: {
          created_at?: string
          description: string
          icon: string
          id?: string
          slug: string
          sort_order?: number
          title: string
        }
        Update: {
          created_at?: string
          description?: string
          icon?: string
          id?: string
          slug?: string
          sort_order?: number
          title?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
          about: string | null
          address: string | null
          category_slug: string
          city: string | null
          created_at: string
          eligibility: string | null
          hours: Json | null
          id: string
          image_url: string | null
          is_national: boolean
          latitude: number | null
          longitude: number | null
          name: string
          phone: string | null
          state: string | null
          tags: string[] | null
          updated_at: string
          verified: boolean
          website: string | null
          what_to_bring: string | null
          zip_code: string | null
        }
        Insert: {
          about?: string | null
          address?: string | null
          category_slug: string
          city?: string | null
          created_at?: string
          eligibility?: string | null
          hours?: Json | null
          id?: string
          image_url?: string | null
          is_national?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          phone?: string | null
          state?: string | null
          tags?: string[] | null
          updated_at?: string
          verified?: boolean
          website?: string | null
          what_to_bring?: string | null
          zip_code?: string | null
        }
        Update: {
          about?: string | null
          address?: string | null
          category_slug?: string
          city?: string | null
          created_at?: string
          eligibility?: string | null
          hours?: Json | null
          id?: string
          image_url?: string | null
          is_national?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          phone?: string | null
          state?: string | null
          tags?: string[] | null
          updated_at?: string
          verified?: boolean
          website?: string | null
          what_to_bring?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resources_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "resource_categories"
            referencedColumns: ["slug"]
          },
        ]
      }
      saved_family_resources: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          resource_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          resource_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          resource_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_family_resources_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "community_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_resources: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          resource_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          resource_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          resource_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_resources_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      scanned_inventory_items: {
        Row: {
          category: string | null
          confidence_score: number | null
          confirmed: boolean
          created_at: string
          id: string
          inventory_photo_id: string | null
          item_name: string
          location: string | null
          normalized_item_name: string | null
          quantity: string | null
          rejected: boolean
          unit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          confidence_score?: number | null
          confirmed?: boolean
          created_at?: string
          id?: string
          inventory_photo_id?: string | null
          item_name: string
          location?: string | null
          normalized_item_name?: string | null
          quantity?: string | null
          rejected?: boolean
          unit?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          confidence_score?: number | null
          confirmed?: boolean
          created_at?: string
          id?: string
          inventory_photo_id?: string | null
          item_name?: string
          location?: string | null
          normalized_item_name?: string | null
          quantity?: string | null
          rejected?: boolean
          unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scanned_inventory_items_inventory_photo_id_fkey"
            columns: ["inventory_photo_id"]
            isOneToOne: false
            referencedRelation: "inventory_photos"
            referencedColumns: ["id"]
          },
        ]
      }
      special_meal_collection_recipes: {
        Row: {
          collection_id: string
          id: string
          recipe_id: string
          sort_order: number
        }
        Insert: {
          collection_id: string
          id?: string
          recipe_id: string
          sort_order?: number
        }
        Update: {
          collection_id?: string
          id?: string
          recipe_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "special_meal_collection_recipes_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "special_meal_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_meal_collection_recipes_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      special_meal_collections: {
        Row: {
          cover_image: string | null
          created_at: string
          created_by: string | null
          description: string | null
          estimated_budget: number | null
          id: string
          is_featured: boolean
          publish_end_date: string | null
          publish_start_date: string | null
          publish_status: string
          seasonal_tag: string | null
          title: string
          updated_at: string
        }
        Insert: {
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_budget?: number | null
          id?: string
          is_featured?: boolean
          publish_end_date?: string | null
          publish_start_date?: string | null
          publish_status?: string
          seasonal_tag?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_budget?: number | null
          id?: string
          is_featured?: boolean
          publish_end_date?: string | null
          publish_start_date?: string | null
          publish_status?: string
          seasonal_tag?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      state_price_multipliers: {
        Row: {
          created_at: string
          id: string
          multiplier: number
          notes: string | null
          state_code: string
          state_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          multiplier?: number
          notes?: string | null
          state_code: string
          state_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          multiplier?: number
          notes?: string | null
          state_code?: string
          state_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      store_price_multipliers: {
        Row: {
          created_at: string
          id: string
          multiplier: number
          notes: string | null
          store_code: string
          store_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          multiplier?: number
          notes?: string | null
          store_code: string
          store_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          multiplier?: number
          notes?: string | null
          store_code?: string
          store_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          status: string | null
          ticket_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          status?: string | null
          ticket_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          status?: string | null
          ticket_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_feedback: {
        Row: {
          admin_notes: string | null
          created_at: string
          description: string | null
          entity_id: string | null
          entity_name: string | null
          entity_type: string
          feedback_type: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type: string
          feedback_type: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string
          feedback_type?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_outcomes: {
        Row: {
          actual_spend: number | null
          adherence_score: number | null
          budget_target: number | null
          created_at: string
          id: string
          meals_cooked: number | null
          meals_planned: number | null
          outcome_score: number | null
          savings_amount: number | null
          updated_at: string
          user_id: string
          waste_reported: boolean | null
          week_start: string
        }
        Insert: {
          actual_spend?: number | null
          adherence_score?: number | null
          budget_target?: number | null
          created_at?: string
          id?: string
          meals_cooked?: number | null
          meals_planned?: number | null
          outcome_score?: number | null
          savings_amount?: number | null
          updated_at?: string
          user_id: string
          waste_reported?: boolean | null
          week_start: string
        }
        Update: {
          actual_spend?: number | null
          adherence_score?: number | null
          budget_target?: number | null
          created_at?: string
          id?: string
          meals_cooked?: number | null
          meals_planned?: number | null
          outcome_score?: number | null
          savings_amount?: number | null
          updated_at?: string
          user_id?: string
          waste_reported?: boolean | null
          week_start?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      waitlist_signups: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string | null
          referral_source: string | null
          zip_code: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name?: string | null
          referral_source?: string | null
          zip_code?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          referral_source?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      weekly_meal_plans: {
        Row: {
          breakfast: string | null
          created_at: string
          daily_cost: number | null
          day_of_week: string
          day_order: number
          dinner: string | null
          id: string
          lunch: string | null
          plan_tier: string
          snack: string | null
          supports_people: number
          updated_at: string
          weekly_budget: number
        }
        Insert: {
          breakfast?: string | null
          created_at?: string
          daily_cost?: number | null
          day_of_week: string
          day_order: number
          dinner?: string | null
          id?: string
          lunch?: string | null
          plan_tier: string
          snack?: string | null
          supports_people: number
          updated_at?: string
          weekly_budget: number
        }
        Update: {
          breakfast?: string | null
          created_at?: string
          daily_cost?: number | null
          day_of_week?: string
          day_order?: number
          dinner?: string | null
          id?: string
          lunch?: string | null
          plan_tier?: string
          snack?: string | null
          supports_people?: number
          updated_at?: string
          weekly_budget?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_support_ticket: {
        Args: { _message: string; _name: string; _ticket_type: string }
        Returns: string
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_admin_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_rate_limit: {
        Args: { _endpoint: string; _max_per_hour: number; _user_id: string }
        Returns: {
          allowed: boolean
          current_count: number
          limit_per_hour: number
        }[]
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      log_missing_ingredient: {
        Args: { _name: string; _state_code?: string; _store_code?: string }
        Returns: undefined
      }
      lookup_ingredient_price: {
        Args: { _query: string }
        Returns: {
          avg_price: number
          category: string
          display_name: string
          high_price: number
          id: string
          ingredient_key: string
          low_price: number
          similarity: number
          unit: string
        }[]
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      purge_old_email_send_log: { Args: never; Returns: undefined }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role: "owner" | "admin" | "content_manager" | "moderator"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["owner", "admin", "content_manager", "moderator"],
    },
  },
} as const

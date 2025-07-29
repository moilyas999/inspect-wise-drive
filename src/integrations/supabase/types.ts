export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      businesses: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      inspection_faults: {
        Row: {
          business_id: string | null
          created_at: string
          description: string
          flagged_for_repair: boolean | null
          id: string
          job_id: string
          location: string | null
          media_url: string | null
          type: string
          vehicle_id: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          description: string
          flagged_for_repair?: boolean | null
          id?: string
          job_id: string
          location?: string | null
          media_url?: string | null
          type: string
          vehicle_id?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string
          description?: string
          flagged_for_repair?: boolean | null
          id?: string
          job_id?: string
          location?: string | null
          media_url?: string | null
          type?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_faults_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_faults_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "inspection_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_faults_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_items: {
        Row: {
          business_id: string | null
          condition_rating: number | null
          created_at: string
          id: string
          is_checked: boolean
          item_description: string | null
          item_name: string
          job_id: string
          notes: string | null
          photo_url: string | null
          requires_photo: boolean | null
          section_id: string
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          condition_rating?: number | null
          created_at?: string
          id?: string
          is_checked?: boolean
          item_description?: string | null
          item_name: string
          job_id: string
          notes?: string | null
          photo_url?: string | null
          requires_photo?: boolean | null
          section_id: string
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          condition_rating?: number | null
          created_at?: string
          id?: string
          is_checked?: boolean
          item_description?: string | null
          item_name?: string
          job_id?: string
          notes?: string | null
          photo_url?: string | null
          requires_photo?: boolean | null
          section_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_items_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "inspection_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_items_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "inspection_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_jobs: {
        Row: {
          assigned_to: string
          business_id: string | null
          color: string | null
          created_at: string
          deadline: string | null
          final_agreed_price: number | null
          fuel_type: string | null
          id: string
          make: string
          mileage: number | null
          model: string
          negotiation_status: string | null
          notes: string | null
          priority: string | null
          purchase_date: string | null
          purchase_price: number | null
          reg: string
          review_status: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          seller_address: string | null
          status: string
          transmission: string | null
          updated_at: string
          vehicle_id: string | null
          vin: string | null
          year: number | null
        }
        Insert: {
          assigned_to: string
          business_id?: string | null
          color?: string | null
          created_at?: string
          deadline?: string | null
          final_agreed_price?: number | null
          fuel_type?: string | null
          id?: string
          make: string
          mileage?: number | null
          model: string
          negotiation_status?: string | null
          notes?: string | null
          priority?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          reg: string
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          seller_address?: string | null
          status?: string
          transmission?: string | null
          updated_at?: string
          vehicle_id?: string | null
          vin?: string | null
          year?: number | null
        }
        Update: {
          assigned_to?: string
          business_id?: string | null
          color?: string | null
          created_at?: string
          deadline?: string | null
          final_agreed_price?: number | null
          fuel_type?: string | null
          id?: string
          make?: string
          mileage?: number | null
          model?: string
          negotiation_status?: string | null
          notes?: string | null
          priority?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          reg?: string
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          seller_address?: string | null
          status?: string
          transmission?: string | null
          updated_at?: string
          vehicle_id?: string | null
          vin?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_jobs_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "inspectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_jobs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_jobs_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "inspectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_jobs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_media: {
        Row: {
          business_id: string | null
          caption: string | null
          duration: number | null
          file_size: number | null
          id: string
          inspection_item_id: string | null
          is_before_photo: boolean | null
          job_id: string
          lat: number | null
          lng: number | null
          media_type: string
          section: string
          timestamp: string
          url: string
          vehicle_id: string | null
        }
        Insert: {
          business_id?: string | null
          caption?: string | null
          duration?: number | null
          file_size?: number | null
          id?: string
          inspection_item_id?: string | null
          is_before_photo?: boolean | null
          job_id: string
          lat?: number | null
          lng?: number | null
          media_type?: string
          section: string
          timestamp?: string
          url: string
          vehicle_id?: string | null
        }
        Update: {
          business_id?: string | null
          caption?: string | null
          duration?: number | null
          file_size?: number | null
          id?: string
          inspection_item_id?: string | null
          is_before_photo?: boolean | null
          job_id?: string
          lat?: number | null
          lng?: number | null
          media_type?: string
          section?: string
          timestamp?: string
          url?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_media_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_media_inspection_item_id_fkey"
            columns: ["inspection_item_id"]
            isOneToOne: false
            referencedRelation: "inspection_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_media_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "inspection_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_media_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_sections: {
        Row: {
          business_id: string | null
          created_at: string
          id: string
          inspector_comments: string | null
          is_complete: boolean
          job_id: string
          notes: string | null
          rating: number | null
          section_name: string
          section_order: number
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          id?: string
          inspector_comments?: string | null
          is_complete?: boolean
          job_id: string
          notes?: string | null
          rating?: number | null
          section_name: string
          section_order: number
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          id?: string
          inspector_comments?: string | null
          is_complete?: boolean
          job_id?: string
          notes?: string | null
          rating?: number | null
          section_name?: string
          section_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_sections_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "inspection_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_steps: {
        Row: {
          business_id: string | null
          created_at: string
          id: string
          is_complete: boolean
          job_id: string
          notes: string | null
          rating: number | null
          section: string
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          id?: string
          is_complete?: boolean
          job_id: string
          notes?: string | null
          rating?: number | null
          section: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string
          id?: string
          is_complete?: boolean
          job_id?: string
          notes?: string | null
          rating?: number | null
          section?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_steps_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_steps_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "inspection_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_steps_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      inspectors: {
        Row: {
          business_id: string | null
          created_at: string
          created_by: string | null
          email: string
          id: string
          name: string
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          id?: string
          name: string
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          id?: string
          name?: string
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspectors_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      negotiation_offers: {
        Row: {
          amount: number
          business_id: string
          created_at: string
          id: string
          job_id: string
          notes: string | null
          offer_type: string
          offered_by: string
          offered_by_user_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          business_id: string
          created_at?: string
          id?: string
          job_id: string
          notes?: string | null
          offer_type: string
          offered_by: string
          offered_by_user_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          business_id?: string
          created_at?: string
          id?: string
          job_id?: string
          notes?: string | null
          offer_type?: string
          offered_by?: string
          offered_by_user_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      prep_progress: {
        Row: {
          business_id: string
          completed_at: string | null
          created_at: string
          fault_id: string
          id: string
          notes: string | null
          parts_used: string | null
          repair_photo_url: string | null
          repair_video_url: string | null
          repaired_by: string | null
          status: string
          time_taken: number | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          business_id: string
          completed_at?: string | null
          created_at?: string
          fault_id: string
          id?: string
          notes?: string | null
          parts_used?: string | null
          repair_photo_url?: string | null
          repair_video_url?: string | null
          repaired_by?: string | null
          status?: string
          time_taken?: number | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          business_id?: string
          completed_at?: string | null
          created_at?: string
          fault_id?: string
          id?: string
          notes?: string | null
          parts_used?: string | null
          repair_photo_url?: string | null
          repair_video_url?: string | null
          repaired_by?: string | null
          status?: string
          time_taken?: number | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prep_progress_fault_id_fkey"
            columns: ["fault_id"]
            isOneToOne: false
            referencedRelation: "inspection_faults"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prep_progress_repaired_by_fkey"
            columns: ["repaired_by"]
            isOneToOne: false
            referencedRelation: "inspectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prep_progress_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
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
      vehicles: {
        Row: {
          business_id: string
          created_at: string
          current_stage: string
          id: string
          make: string
          model: string
          reg: string
          status: string
          updated_at: string
          vin: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          current_stage?: string
          id?: string
          make: string
          model: string
          reg: string
          status?: string
          updated_at?: string
          vin?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          current_stage?: string
          id?: string
          make?: string
          model?: string
          reg?: string
          status?: string
          updated_at?: string
          vin?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_inspection_sections: {
        Args: { p_job_id: string; p_business_id: string }
        Returns: undefined
      }
      create_sample_inspection_jobs: {
        Args: Record<PropertyKey, never>
        Returns: {
          jobs_created: number
          message: string
        }[]
      }
      get_user_business_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      is_user_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "staff"
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
      app_role: ["admin", "staff"],
    },
  },
} as const

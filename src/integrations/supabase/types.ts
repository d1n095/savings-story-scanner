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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_memory: {
        Row: {
          confidence: number | null
          created_at: string
          fact: string
          id: string
          topic: string
          user_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          fact: string
          id?: string
          topic: string
          user_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          fact?: string
          id?: string
          topic?: string
          user_id?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          description: string | null
          id: string
          is_recurring: boolean | null
          merchant: string | null
          occurred_at: string
          recurrence_pattern: string | null
          source: string | null
          user_id: string
        }
        Insert: {
          amount: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          description?: string | null
          id?: string
          is_recurring?: boolean | null
          merchant?: string | null
          occurred_at?: string
          recurrence_pattern?: string | null
          source?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          description?: string | null
          id?: string
          is_recurring?: boolean | null
          merchant?: string | null
          occurred_at?: string
          recurrence_pattern?: string | null
          source?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          collective_agreement: string | null
          created_at: string
          display_name: string | null
          hourly_rate: number | null
          id: string
          monthly_buffer_goal: number | null
          ob_rules: Json | null
          onboarded: boolean | null
          tax_rate: number | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          collective_agreement?: string | null
          created_at?: string
          display_name?: string | null
          hourly_rate?: number | null
          id: string
          monthly_buffer_goal?: number | null
          ob_rules?: Json | null
          onboarded?: boolean | null
          tax_rate?: number | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          collective_agreement?: string | null
          created_at?: string
          display_name?: string | null
          hourly_rate?: number | null
          id?: string
          monthly_buffer_goal?: number | null
          ob_rules?: Json | null
          onboarded?: boolean | null
          tax_rate?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          created_at: string
          done: boolean | null
          id: string
          notes: string | null
          recurrence: string | null
          remind_at: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          done?: boolean | null
          id?: string
          notes?: string | null
          recurrence?: string | null
          remind_at: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          done?: boolean | null
          id?: string
          notes?: string | null
          recurrence?: string | null
          remind_at?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      shift_templates: {
        Row: {
          break_minutes: number
          color: string | null
          created_at: string
          ends_time: string
          hourly_rate: number | null
          id: string
          name: string
          sort_order: number
          starts_time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          break_minutes?: number
          color?: string | null
          created_at?: string
          ends_time: string
          hourly_rate?: number | null
          id?: string
          name: string
          sort_order?: number
          starts_time: string
          updated_at?: string
          user_id: string
        }
        Update: {
          break_minutes?: number
          color?: string | null
          created_at?: string
          ends_time?: string
          hourly_rate?: number | null
          id?: string
          name?: string
          sort_order?: number
          starts_time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shifts: {
        Row: {
          base_amount: number | null
          break_minutes: number
          created_at: string
          ends_at: string
          hourly_rate: number | null
          id: string
          is_extra: boolean | null
          notes: string | null
          ob_amount: number | null
          starts_at: string
          title: string | null
          total_amount: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          base_amount?: number | null
          break_minutes?: number
          created_at?: string
          ends_at: string
          hourly_rate?: number | null
          id?: string
          is_extra?: boolean | null
          notes?: string | null
          ob_amount?: number | null
          starts_at: string
          title?: string | null
          total_amount?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          base_amount?: number | null
          break_minutes?: number
          created_at?: string
          ends_at?: string
          hourly_rate?: number | null
          id?: string
          is_extra?: boolean | null
          notes?: string | null
          ob_amount?: number | null
          starts_at?: string
          title?: string | null
          total_amount?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      signals: {
        Row: {
          action_label: string | null
          action_path: string | null
          body: string | null
          created_at: string
          dismissed: boolean | null
          expires_at: string | null
          id: string
          pinned: boolean | null
          severity: Database["public"]["Enums"]["signal_severity"]
          source: string | null
          title: string
          user_id: string
        }
        Insert: {
          action_label?: string | null
          action_path?: string | null
          body?: string | null
          created_at?: string
          dismissed?: boolean | null
          expires_at?: string | null
          id?: string
          pinned?: boolean | null
          severity?: Database["public"]["Enums"]["signal_severity"]
          source?: string | null
          title: string
          user_id: string
        }
        Update: {
          action_label?: string | null
          action_path?: string | null
          body?: string | null
          created_at?: string
          dismissed?: boolean | null
          expires_at?: string | null
          id?: string
          pinned?: boolean | null
          severity?: Database["public"]["Enums"]["signal_severity"]
          source?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      timeline_events: {
        Row: {
          amount: number | null
          color: string | null
          created_at: string
          ends_at: string | null
          icon: string | null
          id: string
          kind: Database["public"]["Enums"]["timeline_kind"]
          metadata: Json | null
          occurs_at: string
          source_id: string | null
          source_table: string | null
          subtitle: string | null
          title: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          color?: string | null
          created_at?: string
          ends_at?: string | null
          icon?: string | null
          id?: string
          kind: Database["public"]["Enums"]["timeline_kind"]
          metadata?: Json | null
          occurs_at: string
          source_id?: string | null
          source_table?: string | null
          subtitle?: string | null
          title: string
          user_id: string
        }
        Update: {
          amount?: number | null
          color?: string | null
          created_at?: string
          ends_at?: string | null
          icon?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["timeline_kind"]
          metadata?: Json | null
          occurs_at?: string
          source_id?: string | null
          source_table?: string | null
          subtitle?: string | null
          title?: string
          user_id?: string
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
          role?: Database["public"]["Enums"]["app_role"]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      expense_category:
        | "mat"
        | "transport"
        | "boende"
        | "noje"
        | "prenumeration"
        | "klader"
        | "halsa"
        | "sparande"
        | "overforing"
        | "annat"
      signal_severity: "info" | "warning" | "critical"
      timeline_kind:
        | "shift"
        | "expense"
        | "income"
        | "reminder"
        | "holiday"
        | "nameday"
        | "signal"
        | "note"
        | "health"
        | "travel"
        | "document"
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
      app_role: ["admin", "user"],
      expense_category: [
        "mat",
        "transport",
        "boende",
        "noje",
        "prenumeration",
        "klader",
        "halsa",
        "sparande",
        "overforing",
        "annat",
      ],
      signal_severity: ["info", "warning", "critical"],
      timeline_kind: [
        "shift",
        "expense",
        "income",
        "reminder",
        "holiday",
        "nameday",
        "signal",
        "note",
        "health",
        "travel",
        "document",
      ],
    },
  },
} as const

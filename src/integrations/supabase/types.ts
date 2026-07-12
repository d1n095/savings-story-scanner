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
      absences: {
        Row: {
          created_at: string
          ends_on: string
          id: string
          kind: Database["public"]["Enums"]["absence_kind"]
          note: string | null
          paid: boolean
          starts_on: string
          status: Database["public"]["Enums"]["absence_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ends_on: string
          id?: string
          kind?: Database["public"]["Enums"]["absence_kind"]
          note?: string | null
          paid?: boolean
          starts_on: string
          status?: Database["public"]["Enums"]["absence_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          ends_on?: string
          id?: string
          kind?: Database["public"]["Enums"]["absence_kind"]
          note?: string | null
          paid?: boolean
          starts_on?: string
          status?: Database["public"]["Enums"]["absence_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
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
          max_week_hours: number
          min_rest_hours: number
          monthly_buffer_goal: number | null
          ob_rules: Json | null
          onboarded: boolean | null
          tax_rate: number | null
          updated_at: string
          vacation_days_per_year: number
        }
        Insert: {
          avatar_url?: string | null
          collective_agreement?: string | null
          created_at?: string
          display_name?: string | null
          hourly_rate?: number | null
          id: string
          max_week_hours?: number
          min_rest_hours?: number
          monthly_buffer_goal?: number | null
          ob_rules?: Json | null
          onboarded?: boolean | null
          tax_rate?: number | null
          updated_at?: string
          vacation_days_per_year?: number
        }
        Update: {
          avatar_url?: string | null
          collective_agreement?: string | null
          created_at?: string
          display_name?: string | null
          hourly_rate?: number | null
          id?: string
          max_week_hours?: number
          min_rest_hours?: number
          monthly_buffer_goal?: number | null
          ob_rules?: Json | null
          onboarded?: boolean | null
          tax_rate?: number | null
          updated_at?: string
          vacation_days_per_year?: number
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
      pay_periods: {
        Row: {
          created_at: string
          id: string
          is_locked: boolean
          notes: string | null
          payday: string
          period_end: string
          period_start: string
          status: string
          total_earned: number | null
          total_paid: number | null
          updated_at: string
          user_id: string
          work_profile_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_locked?: boolean
          notes?: string | null
          payday: string
          period_end: string
          period_start: string
          status?: string
          total_earned?: number | null
          total_paid?: number | null
          updated_at?: string
          user_id: string
          work_profile_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_locked?: boolean
          notes?: string | null
          payday?: string
          period_end?: string
          period_start?: string
          status?: string
          total_earned?: number | null
          total_paid?: number | null
          updated_at?: string
          user_id?: string
          work_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pay_periods_work_profile_id_fkey"
            columns: ["work_profile_id"]
            isOneToOne: false
            referencedRelation: "work_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rotations: {
        Row: {
          created_at: string
          cycle_weeks: number
          id: string
          name: string
          updated_at: string
          user_id: string
          weeks_json: Json
        }
        Insert: {
          created_at?: string
          cycle_weeks?: number
          id?: string
          name: string
          updated_at?: string
          user_id: string
          weeks_json?: Json
        }
        Update: {
          created_at?: string
          cycle_weeks?: number
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
          weeks_json?: Json
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
          active_minutes: number
          base_amount: number | null
          break_minutes: number
          created_at: string
          deleted_at: string | null
          ends_at: string
          hourly_rate: number | null
          id: string
          is_extra: boolean | null
          notes: string | null
          ob_amount: number | null
          on_call_hours: number | null
          pay_period_id: string | null
          shift_type: Database["public"]["Enums"]["shift_type"]
          starts_at: string
          title: string | null
          total_amount: number | null
          updated_at: string
          user_id: string
          work_profile_id: string | null
        }
        Insert: {
          active_minutes?: number
          base_amount?: number | null
          break_minutes?: number
          created_at?: string
          deleted_at?: string | null
          ends_at: string
          hourly_rate?: number | null
          id?: string
          is_extra?: boolean | null
          notes?: string | null
          ob_amount?: number | null
          on_call_hours?: number | null
          pay_period_id?: string | null
          shift_type?: Database["public"]["Enums"]["shift_type"]
          starts_at: string
          title?: string | null
          total_amount?: number | null
          updated_at?: string
          user_id: string
          work_profile_id?: string | null
        }
        Update: {
          active_minutes?: number
          base_amount?: number | null
          break_minutes?: number
          created_at?: string
          deleted_at?: string | null
          ends_at?: string
          hourly_rate?: number | null
          id?: string
          is_extra?: boolean | null
          notes?: string | null
          ob_amount?: number | null
          on_call_hours?: number | null
          pay_period_id?: string | null
          shift_type?: Database["public"]["Enums"]["shift_type"]
          starts_at?: string
          title?: string | null
          total_amount?: number | null
          updated_at?: string
          user_id?: string
          work_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shifts_work_profile_id_fkey"
            columns: ["work_profile_id"]
            isOneToOne: false
            referencedRelation: "work_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_pay_period_id_fkey"
            columns: ["pay_period_id"]
            isOneToOne: false
            referencedRelation: "pay_periods"
            referencedColumns: ["id"]
          },
        ]
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
      team_members: {
        Row: {
          created_at: string
          id: string
          role: string
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
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
      user_defaults: {
        Row: {
          confidence: number
          id: string
          key: string
          updated_at: string
          user_id: string
          value: Json
        }
        Insert: {
          confidence?: number
          id?: string
          key: string
          updated_at?: string
          user_id: string
          value: Json
        }
        Update: {
          confidence?: number
          id?: string
          key?: string
          updated_at?: string
          user_id?: string
          value?: Json
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
      vacation_balance: {
        Row: {
          created_at: string
          id: string
          saved_days: number
          total_days: number
          updated_at: string
          used_days: number
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          saved_days?: number
          total_days?: number
          updated_at?: string
          used_days?: number
          user_id: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          saved_days?: number
          total_days?: number
          updated_at?: string
          used_days?: number
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      weekly_patterns: {
        Row: {
          created_at: string
          days_json: Json
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          days_json?: Json
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          days_json?: Json
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      work_profiles: {
        Row: {
          bonus_rules: Json | null
          break_rules: Json
          callout_rate: number | null
          collective_agreement: string | null
          commission_rules: Json | null
          created_at: string
          default_shift_from: string | null
          default_shift_to: string | null
          employer: string | null
          hourly_rate: number | null
          id: string
          is_default: boolean
          max_hours_per_day: number | null
          max_hours_per_week: number | null
          mileage_rate: number | null
          min_daily_rest_hours: number | null
          monthly_salary: number | null
          name: string
          ob_rules: Json | null
          occupation: string | null
          on_call_rate: number | null
          overtime_rules: Json | null
          payday_day: number
          payday_offset_months: number
          pension_pct: number | null
          per_diem: number | null
          period_start_day: number
          sick_pay_rate: number | null
          sleeping_on_call_rate: number | null
          standby_rate: number | null
          tax_rate: number | null
          updated_at: string
          user_id: string
          vab_rate: number | null
          vacation_days_per_year: number | null
          vacation_pay_percent: number
          waking_on_call_rate: number | null
          workplace: string | null
        }
        Insert: {
          bonus_rules?: Json | null
          break_rules?: Json
          callout_rate?: number | null
          collective_agreement?: string | null
          commission_rules?: Json | null
          created_at?: string
          default_shift_from?: string | null
          default_shift_to?: string | null
          employer?: string | null
          hourly_rate?: number | null
          id?: string
          is_default?: boolean
          max_hours_per_day?: number | null
          max_hours_per_week?: number | null
          mileage_rate?: number | null
          min_daily_rest_hours?: number | null
          monthly_salary?: number | null
          name?: string
          ob_rules?: Json | null
          occupation?: string | null
          on_call_rate?: number | null
          overtime_rules?: Json | null
          payday_day?: number
          payday_offset_months?: number
          pension_pct?: number | null
          per_diem?: number | null
          period_start_day?: number
          sick_pay_rate?: number | null
          sleeping_on_call_rate?: number | null
          standby_rate?: number | null
          tax_rate?: number | null
          updated_at?: string
          user_id: string
          vab_rate?: number | null
          vacation_days_per_year?: number | null
          vacation_pay_percent?: number
          waking_on_call_rate?: number | null
          workplace?: string | null
        }
        Update: {
          bonus_rules?: Json | null
          break_rules?: Json
          callout_rate?: number | null
          collective_agreement?: string | null
          commission_rules?: Json | null
          created_at?: string
          default_shift_from?: string | null
          default_shift_to?: string | null
          employer?: string | null
          hourly_rate?: number | null
          id?: string
          is_default?: boolean
          max_hours_per_day?: number | null
          max_hours_per_week?: number | null
          mileage_rate?: number | null
          min_daily_rest_hours?: number | null
          monthly_salary?: number | null
          name?: string
          ob_rules?: Json | null
          occupation?: string | null
          on_call_rate?: number | null
          overtime_rules?: Json | null
          payday_day?: number
          payday_offset_months?: number
          pension_pct?: number | null
          per_diem?: number | null
          period_start_day?: number
          sick_pay_rate?: number | null
          sleeping_on_call_rate?: number | null
          standby_rate?: number | null
          tax_rate?: number | null
          updated_at?: string
          user_id?: string
          vab_rate?: number | null
          vacation_days_per_year?: number | null
          vacation_pay_percent?: number
          waking_on_call_rate?: number | null
          workplace?: string | null
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
      absence_kind: "vacation" | "sick" | "vab" | "leave" | "other"
      absence_status: "planned" | "approved" | "taken"
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
      shift_type: "regular" | "waking_on_call" | "sleeping_on_call" | "standby"
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
      absence_kind: ["vacation", "sick", "vab", "leave", "other"],
      absence_status: ["planned", "approved", "taken"],
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
      shift_type: ["regular", "waking_on_call", "sleeping_on_call", "standby"],
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

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      checks: {
        Row: {
          checked_at: string;
          error_message: string | null;
          id: string;
          is_up: boolean;
          response_time_ms: number | null;
          site_id: string;
          status_code: number | null;
        };
        Insert: {
          checked_at?: string;
          error_message?: string | null;
          id?: string;
          is_up: boolean;
          response_time_ms?: number | null;
          site_id: string;
          status_code?: number | null;
        };
        Update: {
          checked_at?: string;
          error_message?: string | null;
          id?: string;
          is_up?: boolean;
          response_time_ms?: number | null;
          site_id?: string;
          status_code?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "checks_site_id_fkey";
            columns: ["site_id"];
            isOneToOne: false;
            referencedRelation: "sites";
            referencedColumns: ["id"];
          },
        ];
      };
      incidents: {
        Row: {
          error_message: string | null;
          id: string;
          resolved_at: string | null;
          site_id: string;
          started_at: string;
        };
        Insert: {
          error_message?: string | null;
          id?: string;
          resolved_at?: string | null;
          site_id: string;
          started_at?: string;
        };
        Update: {
          error_message?: string | null;
          id?: string;
          resolved_at?: string | null;
          site_id?: string;
          started_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "incidents_site_id_fkey";
            columns: ["site_id"];
            isOneToOne: false;
            referencedRelation: "sites";
            referencedColumns: ["id"];
          },
        ];
      };
      sites: {
        Row: {
          check_keyword: string | null;
          check_ssl: boolean;
          consecutive_failures: number;
          created_at: string;
          current_status: string;
          fail_threshold: number;
          id: string;
          interval_seconds: number;
          is_active: boolean;
          last_checked_at: string | null;
          last_notified_at: string | null;
          name: string | null;
          ssl_last_warned_at: string | null;
          url: string;
          user_id: string;
        };
        Insert: {
          check_keyword?: string | null;
          check_ssl?: boolean;
          consecutive_failures?: number;
          created_at?: string;
          current_status?: string;
          fail_threshold?: number;
          id?: string;
          interval_seconds?: number;
          is_active?: boolean;
          last_checked_at?: string | null;
          last_notified_at?: string | null;
          name?: string | null;
          ssl_last_warned_at?: string | null;
          url: string;
          user_id: string;
        };
        Update: {
          check_keyword?: string | null;
          check_ssl?: boolean;
          consecutive_failures?: number;
          created_at?: string;
          current_status?: string;
          fail_threshold?: number;
          id?: string;
          interval_seconds?: number;
          is_active?: boolean;
          last_checked_at?: string | null;
          last_notified_at?: string | null;
          name?: string | null;
          ssl_last_warned_at?: string | null;
          url?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      telegram_accounts: {
        Row: {
          chat_id: string;
          linked_at: string;
          user_id: string;
          username: string | null;
        };
        Insert: {
          chat_id: string;
          linked_at?: string;
          user_id: string;
          username?: string | null;
        };
        Update: {
          chat_id?: string;
          linked_at?: string;
          user_id?: string;
          username?: string | null;
        };
        Relationships: [];
      };
      telegram_links: {
        Row: {
          created_at: string;
          expires_at: string;
          id: string;
          status: string;
          token: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          expires_at: string;
          id?: string;
          status?: string;
          token: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          expires_at?: string;
          id?: string;
          status?: string;
          token?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      webwatch_cron_token: { Args: never; Returns: string };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;

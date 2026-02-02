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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      board_members: {
        Row: {
          availability_json: Json | null
          board_id: string
          budget_max: number | null
          budget_min: number | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["board_role"]
          user_id: string
        }
        Insert: {
          availability_json?: Json | null
          board_id: string
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["board_role"]
          user_id: string
        }
        Update: {
          availability_json?: Json | null
          board_id?: string
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["board_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_members_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      boards: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          chosen_proposal_id: string | null
          created_at: string
          created_by: string
          date_end: string | null
          date_start: string | null
          decision_deadline: string | null
          home_city: string | null
          id: string
          name: string
          status: Database["public"]["Enums"]["board_status"]
          updated_at: string
          vibe_preferences: string[] | null
        }
        Insert: {
          budget_max?: number | null
          budget_min?: number | null
          chosen_proposal_id?: string | null
          created_at?: string
          created_by: string
          date_end?: string | null
          date_start?: string | null
          decision_deadline?: string | null
          home_city?: string | null
          id?: string
          name: string
          status?: Database["public"]["Enums"]["board_status"]
          updated_at?: string
          vibe_preferences?: string[] | null
        }
        Update: {
          budget_max?: number | null
          budget_min?: number | null
          chosen_proposal_id?: string | null
          created_at?: string
          created_by?: string
          date_end?: string | null
          date_start?: string | null
          decision_deadline?: string | null
          home_city?: string | null
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["board_status"]
          updated_at?: string
          vibe_preferences?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "boards_chosen_proposal_fkey"
            columns: ["chosen_proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boards_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          board_id: string
          body: string
          created_at: string
          id: string
          proposal_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          board_id: string
          body: string
          created_at?: string
          id?: string
          proposal_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          board_id?: string
          body?: string
          created_at?: string
          id?: string
          proposal_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          board_id: string
          created_at: string
          email: string
          id: string
          invited_by: string
          message: string | null
          status: Database["public"]["Enums"]["invite_status"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          board_id: string
          created_at?: string
          email: string
          id?: string
          invited_by: string
          message?: string | null
          status?: Database["public"]["Enums"]["invite_status"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          board_id?: string
          created_at?: string
          email?: string
          id?: string
          invited_by?: string
          message?: string | null
          status?: Database["public"]["Enums"]["invite_status"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invites_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string | null
          created_at: string
          id: string
          proposal_id: string | null
          trip_id: string
          type: Database["public"]["Enums"]["message_type"]
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          proposal_id?: string | null
          trip_id: string
          type?: Database["public"]["Enums"]["message_type"]
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          proposal_id?: string | null
          trip_id?: string
          type?: Database["public"]["Enums"]["message_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_proposal_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "trip_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          body: string | null
          created_at: string
          href: string | null
          id: string
          read_at: string | null
          title: string
          trip_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          href?: string | null
          id?: string
          read_at?: string | null
          title: string
          trip_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          href?: string | null
          id?: string
          read_at?: string | null
          title?: string
          trip_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          name: string | null
          phone: string | null
          tagline: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id: string
          name?: string | null
          phone?: string | null
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          phone?: string | null
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      proposal_comments: {
        Row: {
          body: string
          created_at: string
          id: string
          proposal_id: string
          trip_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          proposal_id: string
          trip_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          proposal_id?: string
          trip_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_comments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "trip_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_comments_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_compare: {
        Row: {
          created_at: string
          id: string
          proposal_id: string
          trip_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          proposal_id: string
          trip_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          proposal_id?: string
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_compare_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "trip_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_compare_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_reactions: {
        Row: {
          created_at: string
          id: string
          proposal_id: string
          reaction: string
          trip_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          proposal_id: string
          reaction: string
          trip_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          proposal_id?: string
          reaction?: string
          trip_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_reactions_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "trip_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_reactions_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          attendee_count: number | null
          board_id: string
          cost_activities_total: number | null
          cost_food_total: number | null
          cost_lodging_total: number | null
          cost_transport_total: number | null
          cover_image_url: string
          created_at: string
          created_by: string
          date_end: string | null
          date_start: string | null
          destination: string
          estimated_cost_per_person: number | null
          flexible_dates: boolean | null
          id: string
          image_urls: string[] | null
          lodging_links: string[] | null
          updated_at: string
          vibe_tags: string[] | null
        }
        Insert: {
          attendee_count?: number | null
          board_id: string
          cost_activities_total?: number | null
          cost_food_total?: number | null
          cost_lodging_total?: number | null
          cost_transport_total?: number | null
          cover_image_url: string
          created_at?: string
          created_by: string
          date_end?: string | null
          date_start?: string | null
          destination: string
          estimated_cost_per_person?: number | null
          flexible_dates?: boolean | null
          id?: string
          image_urls?: string[] | null
          lodging_links?: string[] | null
          updated_at?: string
          vibe_tags?: string[] | null
        }
        Update: {
          attendee_count?: number | null
          board_id?: string
          cost_activities_total?: number | null
          cost_food_total?: number | null
          cost_lodging_total?: number | null
          cost_transport_total?: number | null
          cover_image_url?: string
          created_at?: string
          created_by?: string
          date_end?: string | null
          date_start?: string | null
          destination?: string
          estimated_cost_per_person?: number | null
          flexible_dates?: boolean | null
          id?: string
          image_urls?: string[] | null
          lodging_links?: string[] | null
          updated_at?: string
          vibe_tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reactions: {
        Row: {
          comment_id: string
          created_at: string
          emoji: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          emoji: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          emoji?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string | null
          id: string
          invited_by: string
          message: string | null
          phone_number: string | null
          status: Database["public"]["Enums"]["invite_status"]
          token: string
          trip_id: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string | null
          id?: string
          invited_by: string
          message?: string | null
          phone_number?: string | null
          status?: Database["public"]["Enums"]["invite_status"]
          token?: string
          trip_id: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string | null
          id?: string
          invited_by?: string
          message?: string | null
          phone_number?: string | null
          status?: Database["public"]["Enums"]["invite_status"]
          token?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_invites_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_invites_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_members: {
        Row: {
          availability_json: Json | null
          budget_max: number | null
          budget_min: number | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["trip_role"]
          trip_id: string
          user_id: string
        }
        Insert: {
          availability_json?: Json | null
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["trip_role"]
          trip_id: string
          user_id: string
        }
        Update: {
          availability_json?: Json | null
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["trip_role"]
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_members_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_proposals: {
        Row: {
          attendee_count: number | null
          cost_activities_total: number | null
          cost_food_total: number | null
          cost_lodging_total: number | null
          cost_transport_total: number | null
          cover_image_url: string
          created_at: string
          created_by: string
          date_end: string | null
          date_start: string | null
          destination: string
          estimated_cost_per_person: number | null
          flexible_dates: boolean | null
          id: string
          image_urls: string[] | null
          lodging_links: string[] | null
          trip_id: string
          updated_at: string
          vibe_tags: string[] | null
        }
        Insert: {
          attendee_count?: number | null
          cost_activities_total?: number | null
          cost_food_total?: number | null
          cost_lodging_total?: number | null
          cost_transport_total?: number | null
          cover_image_url: string
          created_at?: string
          created_by: string
          date_end?: string | null
          date_start?: string | null
          destination: string
          estimated_cost_per_person?: number | null
          flexible_dates?: boolean | null
          id?: string
          image_urls?: string[] | null
          lodging_links?: string[] | null
          trip_id: string
          updated_at?: string
          vibe_tags?: string[] | null
        }
        Update: {
          attendee_count?: number | null
          cost_activities_total?: number | null
          cost_food_total?: number | null
          cost_lodging_total?: number | null
          cost_transport_total?: number | null
          cover_image_url?: string
          created_at?: string
          created_by?: string
          date_end?: string | null
          date_start?: string | null
          destination?: string
          estimated_cost_per_person?: number | null
          flexible_dates?: boolean | null
          id?: string
          image_urls?: string[] | null
          lodging_links?: string[] | null
          trip_id?: string
          updated_at?: string
          vibe_tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_proposals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_proposals_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_votes: {
        Row: {
          created_at: string
          id: string
          proposal_id: string
          score: number | null
          trip_id: string
          updated_at: string
          user_id: string
          vote: Database["public"]["Enums"]["vote_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          proposal_id: string
          score?: number | null
          trip_id: string
          updated_at?: string
          user_id: string
          vote: Database["public"]["Enums"]["vote_type"]
        }
        Update: {
          created_at?: string
          id?: string
          proposal_id?: string
          score?: number | null
          trip_id?: string
          updated_at?: string
          user_id?: string
          vote?: Database["public"]["Enums"]["vote_type"]
        }
        Relationships: [
          {
            foreignKeyName: "trip_votes_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "trip_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_votes_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          created_at: string
          created_by: string
          date_end: string | null
          date_start: string | null
          decision_deadline: string | null
          flexible_dates: boolean | null
          home_city: string | null
          id: string
          join_code: string | null
          name: string
          pinned_proposal_id: string | null
          status: Database["public"]["Enums"]["trip_status"]
          updated_at: string
        }
        Insert: {
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string
          created_by: string
          date_end?: string | null
          date_start?: string | null
          decision_deadline?: string | null
          flexible_dates?: boolean | null
          home_city?: string | null
          id?: string
          join_code?: string | null
          name: string
          pinned_proposal_id?: string | null
          status?: Database["public"]["Enums"]["trip_status"]
          updated_at?: string
        }
        Update: {
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string
          created_by?: string
          date_end?: string | null
          date_start?: string | null
          decision_deadline?: string | null
          flexible_dates?: boolean | null
          home_city?: string | null
          id?: string
          join_code?: string | null
          name?: string
          pinned_proposal_id?: string | null
          status?: Database["public"]["Enums"]["trip_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trips_pinned_proposal_fkey"
            columns: ["pinned_proposal_id"]
            isOneToOne: false
            referencedRelation: "trip_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      votes: {
        Row: {
          board_id: string
          created_at: string
          id: string
          proposal_id: string
          score: number | null
          updated_at: string
          user_id: string
          vote: Database["public"]["Enums"]["vote_type"]
        }
        Insert: {
          board_id: string
          created_at?: string
          id?: string
          proposal_id: string
          score?: number | null
          updated_at?: string
          user_id: string
          vote: Database["public"]["Enums"]["vote_type"]
        }
        Update: {
          board_id?: string
          created_at?: string
          id?: string
          proposal_id?: string
          score?: number | null
          updated_at?: string
          user_id?: string
          vote?: Database["public"]["Enums"]["vote_type"]
        }
        Relationships: [
          {
            foreignKeyName: "votes_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_join_code: { Args: never; Returns: string }
      is_board_admin: {
        Args: { board_uuid: string; user_uuid: string }
        Returns: boolean
      }
      is_board_member: {
        Args: { board_uuid: string; user_uuid: string }
        Returns: boolean
      }
      is_board_owner: {
        Args: { board_uuid: string; user_uuid: string }
        Returns: boolean
      }
      is_trip_admin: {
        Args: { trip_uuid: string; user_uuid: string }
        Returns: boolean
      }
      is_trip_member: {
        Args: { trip_uuid: string; user_uuid: string }
        Returns: boolean
      }
      is_trip_owner: {
        Args: { trip_uuid: string; user_uuid: string }
        Returns: boolean
      }
      notify_trip_members: {
        Args: {
          _actor_id: string
          _body?: string
          _href?: string
          _title: string
          _trip_id: string
          _type: string
        }
        Returns: undefined
      }
    }
    Enums: {
      board_role: "owner" | "admin" | "member"
      board_status: "active" | "decided" | "archived"
      invite_status: "pending" | "accepted" | "expired"
      message_type: "text" | "proposal" | "system"
      trip_role: "owner" | "admin" | "member"
      trip_status: "planning" | "decided"
      vote_type: "in" | "maybe" | "out"
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
      board_role: ["owner", "admin", "member"],
      board_status: ["active", "decided", "archived"],
      invite_status: ["pending", "accepted", "expired"],
      message_type: ["text", "proposal", "system"],
      trip_role: ["owner", "admin", "member"],
      trip_status: ["planning", "decided"],
      vote_type: ["in", "maybe", "out"],
    },
  },
} as const

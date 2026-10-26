import "react-native-url-polyfill/auto";

import { PostgrestClient } from "@supabase/postgrest-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Faltan EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY en el archivo .env",
  );
}

export const supabase = new PostgrestClient(
  `${supabaseUrl.replace(/\/$/, "")}/rest/v1`,
  {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
    schema: "public",
    timeout: 15000,
  },
);

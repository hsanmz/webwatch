import { useQuery } from "@tanstack/react-query";
import { api, type ApiUser } from "@/lib/api";

export function useCurrentUser() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const data = await api<{ user: ApiUser }>("/api/auth/me");
      return data.user;
    },
    retry: false,
  });
}

import { redirect } from "next/navigation"

import { DEFAULT_ACCOUNT_ID } from "@/lib/accounts"

export default function Index() {
  redirect(`/${DEFAULT_ACCOUNT_ID}`)
}

// functions/api/admin/auth/logout.js
// POST /api/admin/auth/logout

import {
  cookieLogout,
} from "../../../_lib/auth.js";

export async function onRequestPost() {
  return Response.json(
    { sucesso: true },
    {
      status: 200,
      headers: {
        "Set-Cookie": cookieLogout(),
      },
    }
  );
}
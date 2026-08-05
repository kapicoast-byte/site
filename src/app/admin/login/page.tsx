"use client";

import { useActionState } from "react";
import { loginAction, type ActionState } from "../actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState<ActionState, FormData>(loginAction, null);

  return (
    <div className="adm-login">
      <form action={action}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/logo-nav.png" alt="" />
        <div>
          <h1>Kapi Coast admin</h1>
          <p>Sign in to edit the menu, journal, cakes and images.</p>
        </div>

        {state?.error && <div className="adm-err">{state.error}</div>}

        <div className="adm-field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required autoComplete="username" />
        </div>

        <div className="adm-field">
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" required autoComplete="current-password" />
        </div>

        <button className="adm-btn" type="submit" disabled={pending}>
          {pending ? "Checking…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

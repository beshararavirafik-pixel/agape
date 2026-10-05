"use client";
import { useEffect, useState } from "react";
import Planner from "./planner";
import InviteeView from "./invitee-view";
export default function SiteEntry() {
  const [route, setRoute] = useState<
    { token: string; demo: boolean } | null | undefined
  >(undefined);
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    setRoute(
      q.has("invitation")
        ? {
            token: q.get("invitation") || "",
            demo: q.get("invitation") === "sample",
          }
        : null,
    );
  }, []);
  if (route === undefined)
    return (
      <main className="invitee-page">
        <div className="brand">Agapē</div>
      </main>
    );
  return route ? <InviteeView {...route} /> : <Planner />;
}

"use client";
import { useEffect, useState } from "react";
import Planner from "./planner";
import InviteeView from "./invitee-view";
import WeddingWebsite from "./wedding-website";
export default function SiteEntry() {
  const [route, setRoute] = useState<
    { token: string; demo: boolean; website?: boolean } | null | undefined
  >(undefined);
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    setRoute(
      q.has("website")
        ? { token: q.get("website") || "", demo: false, website: true }
        : q.has("invitation")
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
  return route ? (
    route.website ? (
      <WeddingWebsite token={route.token} />
    ) : (
      <InviteeView {...route} />
    )
  ) : (
    <Planner />
  );
}

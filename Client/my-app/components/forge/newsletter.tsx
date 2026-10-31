"use client";
import { useState } from "react";
import { ArrowRight, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  return (
    <section className="forge-newsletter forge-container">
      <div className="forge-newsletter-icon">
        <Radio size={28} />
      </div>
      <div>
        <p className="forge-eyebrow">STAY IN THE LOOP</p>
        <h2>First in line. Next in game.</h2>
        <p>Drop alerts are coming soon. Save your interest on this device.</p>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          try {
            localStorage.setItem("customforge-drop-interest", email);
            setMessage(
              "Interest saved on this device. Email alerts are not active yet.",
            );
          } catch {
            setMessage(
              "Your browser could not save this preference. Try enabling storage.",
            );
          }
        }}
      >
        <label htmlFor="forge-newsletter-email" className="sr-only">
          Email for future drop alerts
        </label>
        <div>
          <input
            type="email"
            required
            autoComplete="email"
            id="forge-newsletter-email"
            placeholder="Your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="submit" aria-label="Save interest in drop alerts">
            <ArrowRight size={19} />
          </Button>
        </div>
        <p role="status">
          {message || "Local preference only. No email is sent."}
        </p>
      </form>
    </section>
  );
}

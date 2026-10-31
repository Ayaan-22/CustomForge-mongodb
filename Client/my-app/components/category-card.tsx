"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";

export function CategoryCard({
  name,
  href,
  image,
}: {
  name: string;
  href: string;
  image: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
    >
      <Link href={href}>
        <Card className="overflow-hidden bg-card/60 backdrop-blur border-border/60">
          <div className="aspect-[16/9]">
            <img
              src={
                image ||
                "/placeholder.svg?height=180&width=320&query=Category image"
              }
              alt={name}
              className="h-full w-full object-cover"
              crossOrigin="anonymous"
            />
          </div>
          <div className="p-4">
            <h3 className="font-medium">{name}</h3>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}

"use client";

import SportModuleClient from "../_components/sport-module";
import { swimmingConfig } from "@/lib/sport-configs";

export default function SwimmingModuleClient() {
    return <SportModuleClient config={swimmingConfig} />;
}

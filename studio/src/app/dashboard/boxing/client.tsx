"use client";

import SportModuleClient from "../_components/sport-module";
import { boxingConfig } from "@/lib/sport-configs";

export default function BoxingModuleClient() {
    return <SportModuleClient config={boxingConfig} />;
}

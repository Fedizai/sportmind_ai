"use client";

import SportModuleClient from "../_components/sport-module";
import { basketballConfig } from "@/lib/sport-configs";

export default function BasketballModuleClient() {
    return <SportModuleClient config={basketballConfig} />;
}

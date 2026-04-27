import ControlClient from "@/components/control/ControlClient";

export const dynamic = "force-dynamic";

export default function RemotePage() {
  return <ControlClient remoteOnly />;
}

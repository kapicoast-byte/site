import { getSettings, hoursOf } from "@/lib/settings";
import SettingsForm from "@/components/SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const s = await getSettings();
  return (
    <>
      <div className="adm__head">
        <div>
          <h1>Site settings</h1>
          <p>Name, contact, hours, hero copy and the images used across the site.</p>
        </div>
      </div>
      <SettingsForm
        s={JSON.parse(JSON.stringify(s))}
        hours={hoursOf(s)}
      />
    </>
  );
}

import { TextInput } from '../UI/TextInput';
import { DateInput } from '../UI/DateInput';

interface ClientInfo {
  attorneyName: string;
  clientName: string;
  dateOfInjury: string;
  date: string;
}

interface ClientInfoSectionProps {
  clientInfo: ClientInfo;
  onUpdate: (field: keyof ClientInfo, value: string) => void;
}

/**
 * Client Information Section
 * Collects attorney name, client name, DOI, and statement date
 */
export function ClientInfoSection({ clientInfo, onUpdate }: ClientInfoSectionProps) {
  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Client Information
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <TextInput
          id="attorney-name"
          label="Attorney Name"
          value={clientInfo.attorneyName}
          onChange={(value) => onUpdate('attorneyName', value)}
          placeholder="Attorney Name"
        />
        <TextInput
          id="client-name"
          label="Client Name"
          value={clientInfo.clientName}
          onChange={(value) => onUpdate('clientName', value)}
          placeholder="Client Name"
        />
        <DateInput
          id="date-of-injury"
          label="Date of Injury"
          value={clientInfo.dateOfInjury}
          onChange={(value) => onUpdate('dateOfInjury', value)}
        />
        <DateInput
          id="statement-date"
          label="Date"
          value={clientInfo.date}
          onChange={(value) => onUpdate('date', value)}
        />
      </div>
    </div>
  );
}

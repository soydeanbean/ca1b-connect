import "./ScheduleModal.css";

type ScheduleStatus = "done" | "ongoing" | "upcoming";

type ScheduleItem = {
  time: string;
  subject: string;
  room: string;
  status: ScheduleStatus;
};

type Props = {
  open: boolean;
  onClose: () => void;
  item: ScheduleItem | null;
};

export default function ScheduleModal({ open, onClose, item }: Props) {
  if (!open || !item) return null;

  const getStatusLabel = (status: ScheduleStatus) => {
    if (status === "done") return "Completed";
    if (status === "ongoing") return "Ongoing";
    return "Upcoming";
  };

  return (
    <div className="schedule-modal-overlay" onClick={onClose}>
      <div className="schedule-modal" onClick={(e) => e.stopPropagation()}>

        <div className="schedule-modal-header">
          <h2>{item.subject}</h2>
          <span className={`status ${item.status}`}>
            {getStatusLabel(item.status)}
          </span>
        </div>

        <div className="schedule-modal-body">

          <div className="modal-row">
            <label>Time</label>
            <p>{item.time}</p>
          </div>

          <div className="modal-row">
            <label>Room</label>
            <p>{item.room}</p>
          </div>

          <div className="modal-row">
            <label>Subject</label>
            <p>{item.subject}</p>
          </div>

        </div>

        <div className="schedule-modal-footer">
          <button onClick={onClose}>Close</button>
        </div>

      </div>
    </div>
  );
}
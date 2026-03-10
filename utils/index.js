export function newMessageTemplate(selectedService, ctx) {
  return {
    user_id: ctx.from.id,
    sender: "user",
    type: selectedService || null,
    text: `${servicesMap[selectedService]} request`,
  };
}

export const servicesMap = {
  new_cycle: "Cycle",
  new_shift: "Shift",
  new_break: "Break",
  fix_logs: "Fixing logs",
  dot: "DOT inspection",
};

namespace JanePacheco.Api.Domain;

public enum Category { Facial, Corporal, Outro }

public enum AppointmentStatus { Agendado, Confirmado, Concluido, Faltou, Cancelado }

public class ServiceItem
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Description { get; set; } = "";
    public Category Category { get; set; }
    public int DurationMin { get; set; }
    public decimal Price { get; set; }
    public int SortOrder { get; set; }
    public bool Active { get; set; } = true;
}

public class Professional
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public bool Active { get; set; } = true;
}

public class Appointment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateOnly Date { get; set; }
    /// <summary>Minutos desde 00:00 (ex.: 14:30 = 870).</summary>
    public int StartMin { get; set; }
    public int DurationMin { get; set; }

    public int ServiceId { get; set; }
    public ServiceItem? Service { get; set; }
    // Cópia no momento do agendamento, para o histórico não mudar se o serviço for editado.
    public string ServiceName { get; set; } = "";
    public Category Category { get; set; }
    public decimal Price { get; set; }

    public int ProfessionalId { get; set; }
    public Professional? Professional { get; set; }

    public string ClientName { get; set; } = "";
    public string ClientPhone { get; set; } = "";
    public string? Notes { get; set; }

    public AppointmentStatus Status { get; set; } = AppointmentStatus.Agendado;
    /// <summary>"site" ou "equipe".</summary>
    public string Origin { get; set; } = "equipe";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class ClinicSettings
{
    public int Id { get; set; } = 1;
    public string Name { get; set; } = "Jane Pacheco Estética";
    public string Tagline { get; set; } = "";
    public string About { get; set; } = "";
    public string Address { get; set; } = "";
    public string WhatsApp { get; set; } = "";
    public string Instagram { get; set; } = "janepachecco";
    public int OpenMin { get; set; } = 8 * 60;
    public int CloseMin { get; set; } = 19 * 60;
    public int SlotMin { get; set; } = 30;
    /// <summary>0 = domingo ... 6 = sábado.</summary>
    public List<int> ClosedDays { get; set; } = [0];
}

public class Photo
{
    public int Id { get; set; }
    /// <summary>"hero", "about" ou "gallery".</summary>
    public string Slot { get; set; } = "gallery";
    public string FileName { get; set; } = "";
    public string Caption { get; set; } = "";
    public int SortOrder { get; set; }
}

// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  Accordion,
  Badge,
  Breadcrumb,
  Button,
  Checkbox,
  Input,
  Modal,
  Pagination,
  RadioGroup,
  Select,
  Skeleton,
  ToastProvider,
  useToast,
} from ".";

afterEach(cleanup);

describe("Button", () => {
  it("renders a button of type=button by default", () => {
    render(<Button>Beli</Button>);
    expect(screen.getByRole("button", { name: "Beli" })).toHaveAttribute("type", "button");
  });

  it("calls onClick", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Beli</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not fire onClick while loading and announces busy state", async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Beli
      </Button>,
    );
    const button = screen.getByRole("button");
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toBeDisabled();
  });

  it("applies the requested variant as a data attribute for styling", () => {
    render(<Button variant="secondary">Lihat</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("data-variant", "secondary");
  });
});

describe("Input", () => {
  it("associates the label with the input", () => {
    render(<Input label="Nama lengkap" name="name" />);
    expect(screen.getByLabelText("Nama lengkap")).toBeInTheDocument();
  });

  it("shows the error, marks the field invalid, and links the description", () => {
    render(<Input label="Email" name="email" error="Format email tidak valid" />);
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("aria-invalid", "true");
    const message = screen.getByText("Format email tidak valid");
    expect(input.getAttribute("aria-describedby")).toContain(message.id);
  });

  it("is not invalid without an error", () => {
    render(<Input label="Email" name="email" />);
    expect(screen.getByLabelText("Email")).not.toHaveAttribute("aria-invalid", "true");
  });

  it("marks required fields", () => {
    render(<Input label="HP" name="phone" required />);
    expect(screen.getByLabelText(/HP/)).toBeRequired();
  });
});

describe("Select, Checkbox, RadioGroup", () => {
  it("Select exposes its label and options", () => {
    render(
      <Select
        label="Ukuran"
        name="size"
        options={[
          { value: "M", label: "M" },
          { value: "L", label: "L" },
        ]}
      />,
    );
    const select = screen.getByLabelText("Ukuran");
    expect(within(select).getAllByRole("option")).toHaveLength(2);
  });

  it("Checkbox toggles", async () => {
    render(<Checkbox label="Setuju" name="agree" />);
    const box = screen.getByLabelText("Setuju");
    await userEvent.click(box);
    expect(box).toBeChecked();
  });

  it("RadioGroup selects exactly one option and reports it", async () => {
    const onChange = vi.fn();
    render(
      <RadioGroup
        legend="Kurir"
        name="courier"
        options={[
          { value: "jne", label: "JNE" },
          { value: "jnt", label: "J&T" },
        ]}
        onChange={onChange}
      />,
    );
    await userEvent.click(screen.getByLabelText("J&T"));
    expect(onChange).toHaveBeenCalledWith("jnt");
    expect(screen.getByRole("group", { name: "Kurir" })).toBeInTheDocument();
  });
});

describe("Badge and Skeleton", () => {
  it("Badge renders text with a tone", () => {
    render(<Badge tone="error">Stok habis</Badge>);
    expect(screen.getByText("Stok habis")).toHaveAttribute("data-tone", "error");
  });

  it("Skeleton is hidden from assistive tech", () => {
    const { container } = render(<Skeleton className="h-4" />);
    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
  });
});

describe("Breadcrumb", () => {
  it("renders a nav landmark with the current page marked", () => {
    render(
      <Breadcrumb
        items={[
          { label: "Beranda", href: "/" },
          { label: "Kaos", href: "/kategori/kaos" },
          { label: "Kaos Basic" },
        ]}
      />,
    );
    expect(screen.getByRole("navigation", { name: /breadcrumb|jejak/i })).toBeInTheDocument();
    expect(screen.getByText("Kaos Basic")).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Kaos" })).toHaveAttribute("href", "/kategori/kaos");
  });
});

describe("Pagination", () => {
  it("links to page numbers with the ?page= param and marks the current page", () => {
    render(<Pagination page={2} totalPages={4} basePath="/produk" />);
    expect(screen.getByRole("link", { name: "3" })).toHaveAttribute("href", "/produk?page=3");
    expect(screen.getByRole("link", { name: "1" })).toHaveAttribute("href", "/produk");
    expect(screen.getByText("2")).toHaveAttribute("aria-current", "page");
  });

  it("preserves existing query params", () => {
    render(<Pagination page={1} totalPages={3} basePath="/produk" query={{ size: "M" }} />);
    expect(screen.getByRole("link", { name: "2" })).toHaveAttribute(
      "href",
      "/produk?size=M&page=2",
    );
  });

  it("renders nothing for a single page", () => {
    const { container } = render(<Pagination page={1} totalPages={1} basePath="/produk" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("disables previous on the first page and next on the last", () => {
    const { rerender } = render(<Pagination page={1} totalPages={3} basePath="/p" />);
    expect(screen.queryByRole("link", { name: /sebelumnya/i })).not.toBeInTheDocument();
    rerender(<Pagination page={3} totalPages={3} basePath="/p" />);
    expect(screen.queryByRole("link", { name: /berikutnya/i })).not.toBeInTheDocument();
  });
});

describe("Accordion", () => {
  it("toggles content using disclosure semantics", async () => {
    render(<Accordion items={[{ id: "bahan", title: "Bahan", content: "Katun combed" }]} />);
    const trigger = screen.getByRole("button", { name: "Bahan" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Katun combed")).toBeVisible();
  });
});

describe("Modal", () => {
  beforeAll(() => {
    HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    };
  });

  it("opens with a labelled dialog", () => {
    render(
      <Modal open title="Panduan ukuran" onClose={() => {}}>
        isi
      </Modal>,
    );
    expect(screen.getByRole("dialog", { name: "Panduan ukuran" })).toBeInTheDocument();
  });

  it("calls onClose when the close button is pressed", async () => {
    const onClose = vi.fn();
    render(
      <Modal open title="Panduan" onClose={onClose}>
        isi
      </Modal>,
    );
    await userEvent.click(screen.getByRole("button", { name: /tutup/i }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe("Toast", () => {
  function Trigger() {
    const toast = useToast();
    return <button onClick={() => toast.show("Ditambahkan ke keranjang")}>tambah</button>;
  }

  it("announces messages in a polite live region", async () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByText("tambah"));
    const status = screen.getByRole("status");
    expect(within(status).getByText("Ditambahkan ke keranjang")).toBeInTheDocument();
  });

  it("useToast throws outside the provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Trigger />)).toThrow(/ToastProvider/);
    spy.mockRestore();
  });
});

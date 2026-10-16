package expo.modules.chakulaprinter

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothSocket
import android.content.Context
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.IOException
import java.util.UUID

// The serial port profile that Bluetooth receipt printers speak.
private val SPP: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")

class PrinterException(message: String, cause: Throwable? = null) : CodedException("ERR_PRINTER", message, cause)

// Sends bytes to a Bluetooth receipt printer the phone is already paired with (Android Settings ›
// Bluetooth). The ESC/POS bytes are made in JavaScript; this only lists printers and writes.
// Permission (Nearby devices) is asked for from JavaScript before these are called.
@SuppressLint("MissingPermission")
class ChakulaPrinterModule : Module() {
  private var socket: BluetoothSocket? = null
  private var address: String? = null
  private val lock = Any()

  private val adapter: BluetoothAdapter?
    get() = (appContext.reactContext?.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager)?.adapter

  override fun definition() = ModuleDefinition {
    Name("ChakulaPrinter")

    // [{ name, address }] for every paired Bluetooth device.
    AsyncFunction("pairedDevicesAsync") {
      val a = ready()
      try {
        a.bondedDevices.map { mapOf("name" to (it.name ?: it.address), "address" to it.address) }
      } catch (e: SecurityException) {
        throw noPermission(e)
      }
    }

    AsyncFunction("printAsync") { addr: String, data: ByteArray ->
      synchronized(lock) {
        try {
          write(addr, data)
        } catch (e: SecurityException) {
          close()
          throw noPermission(e)
        } catch (e: IOException) {
          // Printers drop idle links; try once more on a fresh one.
          close()
          try {
            write(addr, data)
          } catch (e2: IOException) {
            close()
            throw PrinterException("Couldn't reach the printer. Check it's on, has paper and is near this phone.", e2)
          }
        }
      }
    }

    AsyncFunction("disconnectAsync") {
      synchronized(lock) { close() }
    }

    OnDestroy {
      close()
    }
  }

  private fun ready(): BluetoothAdapter {
    val a = adapter ?: throw PrinterException("This phone has no Bluetooth.")
    if (!a.isEnabled) throw PrinterException("Bluetooth is off. Turn it on and try again.")
    return a
  }

  private fun noPermission(e: Throwable) =
    PrinterException("Allow Nearby devices for Chakula Kitchen in the phone's Settings.", e)

  private fun write(addr: String, data: ByteArray) {
    val out = connect(addr).outputStream
    // Small pieces, so cheap printers with tiny buffers keep up.
    var i = 0
    while (i < data.size) {
      val n = minOf(512, data.size - i)
      out.write(data, i, n)
      out.flush()
      i += n
    }
  }

  private fun connect(addr: String): BluetoothSocket {
    socket?.let { if (address == addr && it.isConnected) return it }
    close()
    val device = ready().getRemoteDevice(addr)
    val s = try {
      device.createRfcommSocketToServiceRecord(SPP).also { it.connect() }
    } catch (e: IOException) {
      // Some printers only accept an unauthenticated link.
      device.createInsecureRfcommSocketToServiceRecord(SPP).also { it.connect() }
    }
    socket = s
    address = addr
    return s
  }

  private fun close() {
    try {
      socket?.close()
    } catch (_: IOException) {
    }
    socket = null
    address = null
  }
}

/**
 * Service for playing notification sounds
 * Uses Web Audio API to generate notification sound
 */
class NotificationSoundService {
  private audioContext: AudioContext | null = null
  private isInitialized = false

  /**
   * Initialize audio context (requires user interaction)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      this.isInitialized = true
    } catch (error) {
      console.error('Error initializing audio context:', error)
    }
  }

  /**
   * Play notification sound
   */
  async play(): Promise<void> {
    if (!this.audioContext) {
      await this.initialize()
    }

    if (!this.audioContext) {
      console.warn('Audio context not available')
      return
    }

    try {
      // Resume audio context if suspended (browser autoplay policy)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume()
      }

      // Generate a pleasant notification sound (two-tone beep)
      const now = this.audioContext.currentTime

      // First tone (higher pitch)
      this.playTone(880, now, 0.15) // A5 note
      
      // Second tone (lower pitch)
      this.playTone(660, now + 0.15, 0.15) // E5 note
    } catch (error) {
      console.error('Error playing notification sound:', error)
    }
  }

  /**
   * Play a single tone
   */
  private playTone(frequency: number, startTime: number, duration: number): void {
    if (!this.audioContext) return

    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(this.audioContext.destination)

    oscillator.frequency.value = frequency
    oscillator.type = 'sine'

    // Envelope for smooth sound
    gainNode.gain.setValueAtTime(0, startTime)
    gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01) // Attack
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration) // Decay

    oscillator.start(startTime)
    oscillator.stop(startTime + duration)
  }

  /**
   * Play urgent notification sound (more prominent)
   */
  async playUrgent(): Promise<void> {
    if (!this.audioContext) {
      await this.initialize()
    }

    if (!this.audioContext) {
      console.warn('Audio context not available')
      return
    }

    try {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume()
      }

      const now = this.audioContext.currentTime

      // Three-tone urgent pattern
      this.playTone(880, now, 0.1)
      this.playTone(880, now + 0.15, 0.1)
      this.playTone(1046, now + 0.3, 0.2) // C6 note (higher)
    } catch (error) {
      console.error('Error playing urgent notification sound:', error)
    }
  }

  /**
   * Test the notification sound
   */
  async test(): Promise<void> {
    await this.play()
  }
}

export const notificationSoundService = new NotificationSoundService()

